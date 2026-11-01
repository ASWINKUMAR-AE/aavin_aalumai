import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.permissions import get_current_user_payload, require_permission
from app.storage.store import resets_store, audit_chain
from app.schemas.schemas import ResetRequestCreate, ResetApprovalRequest, ResetEventResponse

router = APIRouter(prefix="/resets", tags=["Machine Resets"])

@router.post("", response_model=ResetEventResponse)
def create_reset_request(
    req: ResetRequestCreate,
    payload: dict = Depends(require_permission("reset.request"))
):
    user_id = payload.get("sub")
    now = datetime.now(timezone.utc)
    now_str = now.strftime("%Y%m%d_%H%M%S")
    before_key = f"evidence/resets/{req.head_id}/{now_str}_before.jpg"
    after_key = f"evidence/resets/{req.head_id}/{now_str}_after.jpg"

    calculated_prod = (1_000_000 - req.before_counter) + req.after_counter
    reset_id = str(uuid.uuid4())

    doc = {
        "id": reset_id,
        "head_id": req.head_id,
        "worker_id": user_id,
        "before_counter": req.before_counter,
        "after_counter": req.after_counter,
        "before_photo_key": before_key,
        "after_photo_key": after_key,
        "reason": req.reason,
        "approval_status": "pending",
        "calculated_production": calculated_prod,
        "requested_at": now.isoformat()
    }
    resets_store.insert(doc)

    audit_chain.append_event({
        "event_type": "RESET_REQUESTED",
        "reset_id": reset_id,
        "head_id": req.head_id,
        "worker_id": user_id,
        "timestamp": now.isoformat()
    })

    return ResetEventResponse(**doc)

@router.post("/{reset_id}/approve", response_model=ResetEventResponse)
def approve_reset_request(
    reset_id: str,
    req: ResetApprovalRequest,
    payload: dict = Depends(require_permission("reset.approve"))
):
    supervisor_id = payload.get("sub")
    reset_event = resets_store.get_by_id(reset_id)
    if not reset_event:
        raise HTTPException(status_code=404, detail="Reset request not found")

    # Critical Business Rule: A supervisor cannot approve their own reset procedure
    if reset_event.get("worker_id") == supervisor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: A supervisor cannot approve their own reset procedure."
        )

    if reset_event.get("approval_status") != "pending":
        raise HTTPException(status_code=400, detail="Reset request has already been processed")

    now = datetime.now(timezone.utc)
    updated = resets_store.update(reset_id, {
        "approval_status": req.status,
        "rejection_reason": req.reason if req.status == "rejected" else None,
        "supervisor_id": supervisor_id,
        "approved_at": now.isoformat()
    })

    audit_chain.append_event({
        "event_type": "RESET_APPROVED" if req.status == "approved" else "RESET_REJECTED",
        "reset_id": reset_id,
        "status": req.status,
        "supervisor_id": supervisor_id,
        "timestamp": now.isoformat()
    })

    return ResetEventResponse(**updated)

@router.get("", response_model=List[ResetEventResponse])
def list_resets(
    head_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    all_resets = resets_store.read_all()
    filtered = []
    for r in all_resets:
        if head_id and r.get("head_id") != head_id:
            continue
        if status and r.get("approval_status") != status:
            continue
        filtered.append(r)
    filtered.sort(key=lambda r: r.get("requested_at", ""), reverse=True)
    return [ResetEventResponse(**r) for r in filtered]
