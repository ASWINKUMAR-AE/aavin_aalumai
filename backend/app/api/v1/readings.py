import base64
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import get_current_user_payload, require_permission
from app.models.reading import Reading, ReadingCorrection
from app.models.integrity import IdempotencyRecord
from app.schemas.schemas import ReadingSubmitRequest, ReadingResponse
from app.services.reading_service import ReadingService

router = APIRouter(prefix="/readings", tags=["Readings"])

@router.post("", response_model=ReadingResponse)
def submit_reading(
    req: ReadingSubmitRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("reading.capture"))
):
    user_id = payload.get("sub")
    
    # 1. Idempotency Check
    if req.idempotency_key:
        existing = db.query(IdempotencyRecord).filter(
            IdempotencyRecord.idempotency_key == req.idempotency_key
        ).first()
        if existing:
            # Return previously computed reading
            cached_reading_id = existing.response_body.get("id")
            cached = db.query(Reading).filter(Reading.id == cached_reading_id).first()
            if cached:
                return cached

    # 2. Decode Photo Bytes
    try:
        photo_bytes = base64.b64decode(req.photo_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid photo_base64 data")

    # 3. Submit Reading via Service
    try:
        reading = ReadingService.submit_reading(
            db=db,
            machine_id=req.machine_id,
            head_id=req.head_id,
            variant_id=req.variant_id,
            user_id=user_id,
            count=req.confirmed_value,
            ocr_value=req.ocr_value,
            confirmed_value=req.confirmed_value,
            ocr_confidence=req.ocr_confidence,
            device_time=req.device_time,
            device_monotonic_ms=req.device_monotonic_ms,
            device_boot_id=req.device_boot_id,
            source=req.source,
            photo_bytes=photo_bytes,
            capture_device_id=req.capture_device_id,
            reset_event_id=req.reset_event_id,
            slot_id=req.slot_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 4. Save Idempotency Record
    if req.idempotency_key:
        record = IdempotencyRecord(
            idempotency_key=req.idempotency_key,
            endpoint="/api/v1/readings",
            response_code=200,
            response_body={"id": reading.id, "hash": reading.hash}
        )
        db.add(record)
        db.commit()

    return reading

@router.get("", response_model=List[ReadingResponse])
def list_readings(
    machine_id: Optional[str] = Query(None),
    head_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    query = db.query(Reading)
    if machine_id:
        query = query.filter(Reading.machine_id == machine_id)
    if head_id:
        query = query.filter(Reading.head_id == head_id)
        
    readings = query.order_by(Reading.created_at.desc()).offset(offset).limit(limit).all()
    return readings

@router.get("/{reading_id}", response_model=ReadingResponse)
def get_reading(reading_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    reading = db.query(Reading).filter(Reading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    return reading

@router.post("/{reading_id}/corrections")
def request_reading_correction(
    reading_id: str,
    corrected_value: int,
    reason: str,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("reading.correction.request"))
):
    reading = db.query(Reading).filter(Reading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Original reading not found")
        
    correction = ReadingCorrection(
        original_reading_id=reading_id,
        corrected_value=corrected_value,
        reason=reason,
        requesting_user_id=payload.get("sub")
    )
    db.add(correction)
    db.commit()
    return {"status": "success", "message": "Correction record appended without modifying original observation."}
