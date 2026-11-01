import base64
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.permissions import get_current_user_payload, require_permission
from app.storage.store import readings_stream, idempotency_store, audit_chain
from app.schemas.schemas import ReadingSubmitRequest, ReadingResponse
from app.services.reading_service import ReadingService

router = APIRouter(prefix="/readings", tags=["Readings"])

@router.post("", response_model=ReadingResponse)
def submit_reading(
    req: ReadingSubmitRequest,
    payload: dict = Depends(require_permission("reading.capture"))
):
    user_id = payload.get("sub")
    
    # 1. Idempotency Check
    if req.idempotency_key:
        cached = idempotency_store.get_by_id(req.idempotency_key)
        if cached and cached.get("response_body"):
            cached_id = cached["response_body"].get("id")
            matches = readings_stream.read_stream(filter_func=lambda r: r.get("id") == cached_id)
            if matches:
                return ReadingResponse(**matches[0])

    # 2. Decode Photo Bytes
    try:
        photo_bytes = base64.b64decode(req.photo_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid photo_base64 data")

    # 3. Submit Reading via Service
    try:
        reading = ReadingService.submit_reading(
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
        idempotency_store.upsert({
            "idempotency_key": req.idempotency_key,
            "endpoint": "/api/v1/readings",
            "response_code": 200,
            "response_body": {"id": reading.get("id"), "hash": reading.get("hash")},
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    return ReadingResponse(**reading)

@router.get("", response_model=List[ReadingResponse])
def list_readings(
    machine_id: Optional[str] = Query(None),
    head_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    payload: dict = Depends(get_current_user_payload)
):
    filter_fn = None
    if machine_id and head_id:
        filter_fn = lambda r: (r.get("machine_id") == machine_id or r.get("machine_code") == machine_id) and (r.get("head_id") == head_id or r.get("head_code") == head_id)
    elif machine_id:
        filter_fn = lambda r: (r.get("machine_id") == machine_id or r.get("machine_code") == machine_id)
    elif head_id:
        filter_fn = lambda r: (r.get("head_id") == head_id or r.get("head_code") == head_id)

    readings = readings_stream.read_stream(limit=limit, offset=offset, reverse=True, filter_func=filter_fn)
    return [ReadingResponse(**r) for r in readings]

@router.get("/{reading_id}", response_model=ReadingResponse)
def get_reading(reading_id: str, payload: dict = Depends(get_current_user_payload)):
    matches = readings_stream.read_stream(filter_func=lambda r: r.get("id") == reading_id or r.get("reading_id") == reading_id)
    if not matches:
        raise HTTPException(status_code=404, detail="Reading not found")
    return ReadingResponse(**matches[0])

@router.post("/{reading_id}/corrections")
def request_reading_correction(
    reading_id: str,
    corrected_value: int,
    reason: str,
    payload: dict = Depends(require_permission("reading.correction.request"))
):
    matches = readings_stream.read_stream(filter_func=lambda r: r.get("id") == reading_id or r.get("reading_id") == reading_id)
    if not matches:
        raise HTTPException(status_code=404, detail="Original reading not found")
        
    audit_chain.append_event({
        "event_type": "READING_CORRECTION_REQUESTED",
        "original_reading_id": reading_id,
        "corrected_value": corrected_value,
        "reason": reason,
        "requesting_user_id": payload.get("sub"),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"status": "success", "message": "Correction record appended without modifying original observation."}
