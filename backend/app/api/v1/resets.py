from datetime import datetime, timezone
import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import get_current_user_payload, require_permission
from app.models.reading import ResetEvent
from app.schemas.schemas import ResetRequestCreate, ResetApprovalRequest, ResetEventResponse

router = APIRouter(prefix="/resets", tags=["Machine Resets"])

@router.post("", response_model=ResetEventResponse)
def create_reset_request(
    req: ResetRequestCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("reset.request"))
):
    user_id = payload.get("sub")
    
    # Save photos
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    before_key = f"evidence/resets/{req.head_id}/{now_str}_before.jpg"
    after_key = f"evidence/resets/{req.head_id}/{now_str}_after.jpg"

    # Rollover calculation (1,000,000 threshold)
    calculated_prod = (1_000_000 - req.before_counter) + req.after_counter

    reset_event = ResetEvent(
        head_id=req.head_id,
        worker_id=user_id,
        before_counter=req.before_counter,
        after_counter=req.after_counter,
        before_photo_key=before_key,
        after_photo_key=after_key,
        reason=req.reason,
        approval_status="pending",
        calculated_production=calculated_prod,
        requested_at=datetime.now(timezone.utc)
    )
    db.add(reset_event)
    db.commit()
    db.refresh(reset_event)
    return reset_event

@router.post("/{reset_id}/approve", response_model=ResetEventResponse)
def approve_reset_request(
    reset_id: str,
    req: ResetApprovalRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("reset.approve"))
):
    supervisor_id = payload.get("sub")
    reset_event = db.query(ResetEvent).filter(ResetEvent.id == reset_id).first()
    if not reset_event:
        raise HTTPException(status_code=404, detail="Reset request not found")

    # Critical Business Rule: A supervisor cannot approve their own reset procedure
    if reset_event.worker_id == supervisor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conflict of interest: A supervisor cannot approve their own reset procedure."
        )

    if reset_event.approval_status != "pending":
        raise HTTPException(status_code=400, detail="Reset request has already been processed")

    reset_event.approval_status = req.status
    reset_event.rejection_reason = req.reason if req.status == "rejected" else None
    reset_event.supervisor_id = supervisor_id
    reset_event.approved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(reset_event)
    return reset_event

@router.get("", response_model=List[ResetEventResponse])
def list_resets(
    head_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    query = db.query(ResetEvent)
    if head_id:
        query = query.filter(ResetEvent.head_id == head_id)
    if status:
        query = query.filter(ResetEvent.approval_status == status)
    return query.order_by(ResetEvent.requested_at.desc()).all()
