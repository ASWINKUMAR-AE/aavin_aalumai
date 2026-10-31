from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import get_current_user_payload
from app.models.machine import Head, Machine
from app.models.reading import Reading
from app.schemas.schemas import HeadResponse, ReadingResponse, HashChainStatusResponse
from app.services.hash_chain_service import HashChainService

router = APIRouter(prefix="/heads", tags=["Machine Heads"])

@router.get("", response_model=List[HeadResponse])
def get_all_heads(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    heads = db.query(Head).filter(Head.is_active == True).all()
    # Attach latest counter info
    results = []
    for h in heads:
        latest = (
            db.query(Reading)
            .filter(Reading.head_id == h.id)
            .order_by(Reading.created_at.desc())
            .first()
        )
        h_dict = {
            "id": h.id,
            "machine_id": h.machine_id,
            "head_code": h.head_code,
            "head_number": h.head_number,
            "qr_identifier": h.qr_identifier,
            "rated_speed_per_hour": h.rated_speed_per_hour,
            "genesis_hash": h.genesis_hash,
            "current_hash": h.current_hash,
            "is_active": h.is_active,
            "latest_counter": latest.count if latest else 0,
            "latest_reading_time": latest.created_at if latest else None
        }
        results.append(HeadResponse(**h_dict))
    return results

@router.get("/lookup-qr", response_model=HeadResponse)
def lookup_by_qr(qr: str = Query(...), db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    head = db.query(Head).filter(Head.qr_identifier == qr, Head.is_active == True).first()
    if not head:
        raise HTTPException(status_code=404, detail="Unrecognized Head QR code")
    
    latest = (
        db.query(Reading)
        .filter(Reading.head_id == head.id)
        .order_by(Reading.created_at.desc())
        .first()
    )
    return HeadResponse(
        id=head.id,
        machine_id=head.machine_id,
        head_code=head.head_code,
        head_number=head.head_number,
        qr_identifier=head.qr_identifier,
        rated_speed_per_hour=head.rated_speed_per_hour,
        genesis_hash=head.genesis_hash,
        current_hash=head.current_hash,
        is_active=head.is_active,
        latest_counter=latest.count if latest else 0,
        latest_reading_time=latest.created_at if latest else None
    )

@router.get("/{head_id}", response_model=HeadResponse)
def get_head(head_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    head = db.query(Head).filter(Head.id == head_id).first()
    if not head:
        raise HTTPException(status_code=404, detail="Head not found")
    
    latest = (
        db.query(Reading)
        .filter(Reading.head_id == head.id)
        .order_by(Reading.created_at.desc())
        .first()
    )
    return HeadResponse(
        id=head.id,
        machine_id=head.machine_id,
        head_code=head.head_code,
        head_number=head.head_number,
        qr_identifier=head.qr_identifier,
        rated_speed_per_hour=head.rated_speed_per_hour,
        genesis_hash=head.genesis_hash,
        current_hash=head.current_hash,
        is_active=head.is_active,
        latest_counter=latest.count if latest else 0,
        latest_reading_time=latest.created_at if latest else None
    )

@router.get("/{head_id}/chain-status", response_model=HashChainStatusResponse)
def get_chain_status(head_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    head = db.query(Head).filter(Head.id == head_id).first()
    if not head:
        raise HTTPException(status_code=404, detail="Head not found")

    is_valid, total_checked, discrepancies = HashChainService.verify_head_chain(db, head_id)
    return HashChainStatusResponse(
        head_id=head.id,
        head_code=head.head_code,
        is_valid=is_valid,
        total_checked=total_checked,
        genesis_hash=head.genesis_hash,
        latest_hash=head.current_hash,
        last_verified_at=datetime.now(timezone.utc),
        discrepancies=discrepancies
    )

@router.post("/{head_id}/verify-chain", response_model=HashChainStatusResponse)
def trigger_chain_verification(head_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    return get_chain_status(head_id, db, payload)

@router.get("/{head_id}/history", response_model=List[ReadingResponse])
def get_head_reading_history(
    head_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    readings = (
        db.query(Reading)
        .filter(Reading.head_id == head_id)
        .order_by(Reading.created_at.desc())
        .limit(limit)
        .all()
    )
    return readings
