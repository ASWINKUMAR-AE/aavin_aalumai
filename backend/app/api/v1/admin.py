import uuid
import hashlib
from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.permissions import require_permission, get_current_user_payload
from app.core.security import hash_password
from app.storage.store import users_store, audit_chain, heads_store
from app.schemas.schemas import UserResponse
from app.services.hash_chain_service import canonical_json

router = APIRouter(prefix="/admin", tags=["Administration"])

# 1. User Management
@router.get("/users", response_model=List[UserResponse])
def list_users(
    payload: dict = Depends(require_permission("user.manage"))
):
    users = users_store.read_all()
    return [UserResponse(**u) for u in users]

@router.post("/users", response_model=UserResponse)
def create_user(
    username: str,
    email: str,
    password: str,
    full_name: str,
    employee_code: str,
    role: str,
    payload: dict = Depends(require_permission("user.manage"))
):
    existing = users_store.query(lambda u: u.get("username") == username or u.get("email") == email)
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    doc = {
        "id": new_id,
        "username": username,
        "email": email,
        "hashed_password": hash_password(password),
        "full_name": full_name,
        "employee_code": employee_code,
        "role": role,
        "is_active": True,
        "is_locked": False,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    users_store.insert(doc)

    audit_chain.append_event({
        "event_type": "USER_CREATED",
        "actor_id": payload.get("sub"),
        "actor_role": payload.get("role", "admin"),
        "entity_type": "user",
        "entity_id": username,
        "timestamp": now_iso
    })

    return UserResponse(**doc)

@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    is_active: bool,
    payload: dict = Depends(require_permission("user.manage"))
):
    user = users_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    users_store.update(user_id, {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()})
    return {"status": "success", "user_id": user_id, "is_active": is_active}

# 2. Audit Logs
@router.get("/audit-logs")
def list_audit_logs(
    limit: int = 50,
    payload: dict = Depends(require_permission("audit.view"))
):
    events = audit_chain.read_stream(limit=limit, reverse=True)
    return events

# 3. Daily External Hash Anchor Generation
@router.post("/generate-daily-anchor")
def generate_daily_anchor(
    anchor_date: Optional[date] = None,
    payload: dict = Depends(require_permission("chain.verify"))
):
    target_date = anchor_date or date.today()
    heads = heads_store.query(lambda h: h.get("is_active", True))
    head_manifest = {}
    for h in heads:
        head_manifest[h.get("head_code", "")] = {
            "head_id": h.get("id"),
            "qr_identifier": h.get("qr_identifier"),
            "latest_hash": h.get("current_hash")
        }

    manifest_payload = {
        "plant_id": "AAVIN_MADURAI_MAIN_DAIRY",
        "date": target_date.isoformat(),
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "heads_count": len(heads),
        "heads": head_manifest
    }
    serialized_manifest = canonical_json(manifest_payload)
    manifest_hash = hashlib.sha256(serialized_manifest.encode("utf-8")).hexdigest()

    audit_chain.append_event({
        "event_type": "DAILY_ANCHOR_GENERATED",
        "anchor_date": target_date.isoformat(),
        "manifest_hash": manifest_hash,
        "heads_anchored": len(heads),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "success",
        "anchor_date": target_date.isoformat(),
        "manifest_hash": manifest_hash,
        "heads_anchored": len(heads)
    }
