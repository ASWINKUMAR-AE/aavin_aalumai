from datetime import datetime, timezone, date
import hashlib
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import require_permission, get_current_user_payload
from app.core.security import hash_password
from app.models.auth import User
from app.models.machine import Machine, Head, HeadThreshold
from app.models.integrity import AuditLog, HashAnchor, NotificationRecipient
from app.schemas.schemas import UserResponse
from app.services.hash_chain_service import canonical_json

router = APIRouter(prefix="/admin", tags=["Administration"])

# 1. User Management
@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("user.manage"))
):
    return db.query(User).all()

@router.post("/users", response_model=UserResponse)
def create_user(
    username: str,
    email: str,
    password: str,
    full_name: str,
    employee_code: str,
    role: str,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("user.manage"))
):
    existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        employee_code=employee_code,
        role=role,
        is_active=True
    )
    db.add(user)
    
    # Audit log
    audit = AuditLog(
        actor_id=payload.get("sub"),
        actor_role=payload.get("role", "admin"),
        action="USER_CREATED",
        entity_type="user",
        entity_id=username,
        after_state={"username": username, "role": role}
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    is_active: bool,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("user.manage"))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    db.commit()
    return {"status": "success", "user_id": user_id, "is_active": is_active}

# 2. Audit Logs
@router.get("/audit-logs")
def list_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("audit.view"))
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

# 3. Notification Recipients
@router.get("/notification-recipients")
def list_recipients(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("notification.manage"))
):
    return db.query(NotificationRecipient).all()

@router.post("/notification-recipients")
def add_recipient(
    name: str,
    email: str,
    min_severity: str = "High",
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("notification.manage"))
):
    recipient = NotificationRecipient(
        name=name,
        email=email,
        min_severity=min_severity,
        is_active=True
    )
    db.add(recipient)
    db.commit()
    return {"status": "success", "id": recipient.id}

# 4. Daily External Hash Anchor Generation
@router.post("/generate-daily-anchor")
def generate_daily_anchor(
    anchor_date: Optional[date] = None,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("chain.verify"))
):
    target_date = anchor_date or date.today()
    existing = db.query(HashAnchor).filter(HashAnchor.anchor_date == target_date).first()
    if existing:
        return {"status": "already_exists", "anchor_hash": existing.manifest_hash}

    heads = db.query(Head).filter(Head.is_active == True).all()
    head_manifest = {}
    for h in heads:
        head_manifest[h.head_code] = {
            "head_id": h.id,
            "qr_identifier": h.qr_identifier,
            "latest_hash": h.current_hash
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
    # Mock signature with signing key reference
    mock_signature = f"SIG_AAVIN_ED25519_{hashlib.sha256((manifest_hash + 'KMS_KEY_2026').encode()).hexdigest()}"

    anchor = HashAnchor(
        anchor_date=target_date,
        heads_count=len(heads),
        manifest_hash=manifest_hash,
        signature=mock_signature,
        manifest_payload=manifest_payload,
        email_status="delivered"
    )
    db.add(anchor)
    db.commit()
    db.refresh(anchor)
    return {
        "status": "success",
        "anchor_id": anchor.id,
        "anchor_date": str(anchor.anchor_date),
        "manifest_hash": manifest_hash,
        "heads_anchored": len(heads)
    }

@router.get("/anchors")
def list_anchors(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    return db.query(HashAnchor).order_by(HashAnchor.anchor_date.desc()).all()
