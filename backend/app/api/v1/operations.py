from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import get_current_user_payload, require_permission
from app.models.operations import WastageEntry, DispatchEntry, MilkBalanceEntry, CalibrationAudit, UnannouncedAudit
from app.schemas.schemas import (
    WastageCreateRequest, WastageResponse,
    DispatchCreateRequest, MilkBalanceCreateRequest, CalibrationAuditCreate
)
from app.services.ocr_table_parser import (
    extract_table_from_zethub_ocr,
    auto_enter_fields_from_table_rows,
)

router = APIRouter(prefix="/operations", tags=["Operations & Audits"])

# 1. Wastage
@router.post("/wastage", response_model=WastageResponse)
def submit_wastage(
    req: WastageCreateRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("wastage.create"))
):
    user_id = payload.get("sub")
    photo_key = None
    if req.photo_base64:
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        photo_key = f"evidence/wastage/{req.machine_id}/{now_str}.jpg"

    entry = WastageEntry(
        machine_id=req.machine_id,
        head_id=req.head_id,
        shift_id=req.shift_id,
        variant_id=req.variant_id,
        packet_count=req.packet_count,
        weight_kg=req.weight_kg,
        photo_key=photo_key,
        reason=req.reason,
        user_id=user_id,
        verification_status="self_reported"
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

@router.get("/wastage", response_model=List[WastageResponse])
def list_wastage(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    return db.query(WastageEntry).order_by(WastageEntry.created_at.desc()).all()

@router.post("/wastage/{id}/verify")
def verify_wastage(
    id: str,
    status: str, # verified, rejected
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("wastage.verify"))
):
    entry = db.query(WastageEntry).filter(WastageEntry.id == id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Wastage entry not found")
    entry.verification_status = status
    entry.verified_by_id = payload.get("sub")
    entry.verification_notes = notes
    db.commit()
    return {"status": "success", "verification_status": status}

# 2. Dispatch
@router.post("/dispatch")
def create_dispatch(
    req: DispatchCreateRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    total = req.crates_count * req.pouches_per_crate
    entry = DispatchEntry(
        dispatch_date=req.dispatch_date,
        shift_id=req.shift_id,
        machine_id=req.machine_id,
        variant_id=req.variant_id,
        crates_count=req.crates_count,
        pouches_per_crate=req.pouches_per_crate,
        total_pouches=total,
        recorded_by_id=payload.get("sub")
    )
    db.add(entry)
    db.commit()
    return {"status": "success", "total_pouches": total}

@router.get("/dispatch")
def list_dispatch(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    return db.query(DispatchEntry).order_by(DispatchEntry.dispatch_date.desc()).all()

# 3. Milk Balance
@router.post("/milk-balance")
def record_milk_balance(
    req: MilkBalanceCreateRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    expected_vol = (req.packet_count * req.pouch_volume_ml) / 1000.0
    diff = req.issued_milk_litres - expected_vol
    loss_pct = (diff / req.issued_milk_litres * 100.0) if req.issued_milk_litres > 0 else 0.0
    is_anomaly = loss_pct > 2.5 or loss_pct < -0.5

    entry = MilkBalanceEntry(
        entry_date=req.entry_date,
        shift_id=req.shift_id,
        variant_id=req.variant_id,
        issued_milk_litres=req.issued_milk_litres,
        pouch_volume_ml=req.pouch_volume_ml,
        packet_count=req.packet_count,
        expected_volume_litres=expected_vol,
        difference_litres=diff,
        loss_percentage=round(loss_pct, 2),
        is_anomaly=is_anomaly
    )
    db.add(entry)
    db.commit()
    return {
        "expected_volume_litres": round(expected_vol, 2),
        "difference_litres": round(diff, 2),
        "loss_percentage": round(loss_pct, 2),
        "is_anomaly": is_anomaly
    }

@router.get("/milk-balance")
def list_milk_balance(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    return db.query(MilkBalanceEntry).order_by(MilkBalanceEntry.entry_date.desc()).all()

# 4. Calibration Audits
@router.post("/calibration")
def record_calibration(
    req: CalibrationAuditCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("calibration.create"))
):
    offset = req.physical_packet_count - req.counter_delta
    offset_pct = (offset / req.counter_delta * 100.0) if req.counter_delta != 0 else 0.0

    entry = CalibrationAudit(
        machine_id=req.machine_id,
        head_id=req.head_id,
        shift_id=req.shift_id,
        variant_id=req.variant_id,
        physical_packet_count=req.physical_packet_count,
        counter_delta=req.counter_delta,
        offset=offset,
        offset_percentage=round(offset_pct, 2),
        auditor_id=payload.get("sub"),
        audit_start_time=req.audit_start_time,
        audit_end_time=req.audit_end_time
    )
    db.add(entry)
    db.commit()
    return {
        "status": "success",
        "offset": offset,
        "offset_percentage": round(offset_pct, 2)
    }

@router.get("/calibration")
def list_calibrations(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    return db.query(CalibrationAudit).order_by(CalibrationAudit.created_at.desc()).all()

@router.get("/unannounced-audits")
def list_unannounced_audits(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    return db.query(UnannouncedAudit).all()

# 5. Table OCR & Field Auto-Entry
@router.post("/ocr/table")
async def process_table_ocr(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Submits a table document image (or image_url) to the ZetHub Table OCR engine,
    and returns auto-entered fields, rows, and structured headers.
    """
    if not file and not image_url:
        raise HTTPException(status_code=400, detail="Must provide either 'file' or 'image_url'")

    image_bytes = None
    filename = "table.jpg"
    content_type = "image/jpeg"
    if file:
        image_bytes = await file.read()
        filename = file.filename or "table.jpg"
        content_type = file.content_type or "image/jpeg"

    try:
        table_raw = await extract_table_from_zethub_ocr(
            image_bytes=image_bytes,
            filename=filename,
            content_type=content_type,
            image_url=image_url
        )
        parsed = auto_enter_fields_from_table_rows(table_raw)
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Table OCR failed: {str(e)}")
