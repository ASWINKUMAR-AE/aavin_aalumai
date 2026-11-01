import uuid
from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form

from app.core.permissions import get_current_user_payload, require_permission
from app.storage.store import (
    wastage_store, dispatch_store, milk_balance_store, calibrations_store,
    shift_handovers_store, downtime_store, heads_store, machines_store,
    readings_stream, anomalies_store, audit_chain, users_store
)
from app.schemas.schemas import (
    WastageCreateRequest, WastageResponse,
    DispatchCreateRequest, MilkBalanceCreateRequest, CalibrationAuditCreate,
    ShiftHandoverRequest, ShiftHandoverResponse, DowntimeLogRequest, DowntimeLogResponse
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
    payload: dict = Depends(require_permission("wastage.create"))
):
    user_id = payload.get("sub")
    photo_key = None
    if req.photo_base64:
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        photo_key = f"evidence/wastage/{req.machine_id}/{now_str}.jpg"

    entry_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": entry_id,
        "machine_id": req.machine_id,
        "head_id": req.head_id,
        "shift_id": req.shift_id,
        "variant_id": req.variant_id,
        "packet_count": req.packet_count,
        "weight_kg": req.weight_kg,
        "photo_key": photo_key,
        "reason": req.reason,
        "user_id": user_id,
        "verification_status": "self_reported",
        "created_at": now_iso
    }
    wastage_store.insert(doc)
    return WastageResponse(**doc)

@router.get("/wastage", response_model=List[WastageResponse])
def list_wastage(payload: dict = Depends(get_current_user_payload)):
    items = wastage_store.read_all()
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return [WastageResponse(**x) for x in items]

@router.post("/wastage/{id}/verify")
def verify_wastage(
    id: str,
    status: str, # verified, rejected
    notes: Optional[str] = None,
    payload: dict = Depends(require_permission("wastage.verify"))
):
    entry = wastage_store.get_by_id(id)
    if not entry:
        raise HTTPException(status_code=404, detail="Wastage entry not found")
    wastage_store.update(id, {
        "verification_status": status,
        "verified_by_id": payload.get("sub"),
        "verification_notes": notes
    })
    return {"status": "success", "verification_status": status}

# 2. Dispatch
@router.post("/dispatch")
def create_dispatch(
    req: DispatchCreateRequest,
    payload: dict = Depends(get_current_user_payload)
):
    total = req.crates_count * req.pouches_per_crate
    entry_id = str(uuid.uuid4())
    doc = {
        "id": entry_id,
        "dispatch_date": req.dispatch_date.isoformat() if hasattr(req.dispatch_date, "isoformat") else str(req.dispatch_date),
        "shift_id": req.shift_id,
        "machine_id": req.machine_id,
        "variant_id": req.variant_id,
        "crates_count": req.crates_count,
        "pouches_per_crate": req.pouches_per_crate,
        "total_pouches": total,
        "recorded_by_id": payload.get("sub"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    dispatch_store.insert(doc)
    return {"status": "success", "total_pouches": total}

@router.get("/dispatch")
def list_dispatch(payload: dict = Depends(get_current_user_payload)):
    items = dispatch_store.read_all()
    items.sort(key=lambda x: x.get("dispatch_date", ""), reverse=True)
    return items

# 3. Milk Balance
@router.post("/milk-balance")
def record_milk_balance(
    req: MilkBalanceCreateRequest,
    payload: dict = Depends(get_current_user_payload)
):
    expected_vol = (req.packet_count * req.pouch_volume_ml) / 1000.0
    diff = req.issued_milk_litres - expected_vol
    loss_pct = (diff / req.issued_milk_litres * 100.0) if req.issued_milk_litres > 0 else 0.0
    is_anomaly = loss_pct > 2.5 or loss_pct < -0.5

    entry_id = str(uuid.uuid4())
    doc = {
        "id": entry_id,
        "entry_date": req.entry_date.isoformat() if hasattr(req.entry_date, "isoformat") else str(req.entry_date),
        "shift_id": req.shift_id,
        "variant_id": req.variant_id,
        "issued_milk_litres": req.issued_milk_litres,
        "pouch_volume_ml": req.pouch_volume_ml,
        "packet_count": req.packet_count,
        "expected_volume_litres": expected_vol,
        "difference_litres": diff,
        "loss_percentage": round(loss_pct, 2),
        "is_anomaly": is_anomaly,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    milk_balance_store.insert(doc)
    return {
        "expected_volume_litres": round(expected_vol, 2),
        "difference_litres": round(diff, 2),
        "loss_percentage": round(loss_pct, 2),
        "is_anomaly": is_anomaly
    }

@router.get("/milk-balance")
def list_milk_balance(payload: dict = Depends(get_current_user_payload)):
    items = milk_balance_store.read_all()
    items.sort(key=lambda x: x.get("entry_date", ""), reverse=True)
    return items

# 4. Calibration Audits
@router.post("/calibration")
def record_calibration(
    req: CalibrationAuditCreate,
    payload: dict = Depends(require_permission("calibration.create"))
):
    offset = req.physical_packet_count - req.counter_delta
    offset_pct = (offset / req.counter_delta * 100.0) if req.counter_delta != 0 else 0.0

    entry_id = str(uuid.uuid4())
    doc = {
        "id": entry_id,
        "machine_id": req.machine_id,
        "head_id": req.head_id,
        "shift_id": req.shift_id,
        "variant_id": req.variant_id,
        "physical_packet_count": req.physical_packet_count,
        "counter_delta": req.counter_delta,
        "offset": offset,
        "offset_percentage": round(offset_pct, 2),
        "auditor_id": payload.get("sub"),
        "audit_start_time": req.audit_start_time.isoformat() if hasattr(req.audit_start_time, "isoformat") else str(req.audit_start_time),
        "audit_end_time": req.audit_end_time.isoformat() if hasattr(req.audit_end_time, "isoformat") else str(req.audit_end_time),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    calibrations_store.insert(doc)
    return {
        "status": "success",
        "offset": offset,
        "offset_percentage": round(offset_pct, 2)
    }

@router.get("/calibration")
def list_calibrations(payload: dict = Depends(get_current_user_payload)):
    items = calibrations_store.read_all()
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items

@router.get("/unannounced-audits")
def list_unannounced_audits(payload: dict = Depends(get_current_user_payload)):
    return []

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


# 6. Shift Handover & Reconciliation
@router.post("/shift-handover", response_model=ShiftHandoverResponse)
def submit_shift_handover(
    req: ShiftHandoverRequest,
    payload: dict = Depends(require_permission("supervisor.verify"))
):
    """
    Submits official shift handover ledger reconciliation.
    Evaluates completed vs expected head readings, detects unrecorded heads,
    and logs immutable handover event into the audit chain.
    """
    actor_id = payload.get("sub", "supervisor")
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    heads = heads_store.query(lambda h: h.get("is_active", True))
    all_head_ids = {h.get("id"): h.get("head_code") for h in heads}

    # Readings recorded during this shift
    recent_readings = readings_stream.read_stream(limit=100, reverse=True)
    recorded_head_ids = {r.get("head_id") for r in recent_readings if r.get("head_id")}

    completed_heads = [h_id for h_id in all_head_ids if h_id in recorded_head_ids]
    missing_head_ids = [h_id for h_id in all_head_ids if h_id not in recorded_head_ids]
    missing_codes = [all_head_ids[h_id] for h_id in missing_head_ids]

    total_prod = sum(r.get("production_delta", 0) for r in recent_readings)
    total_waste = sum(w.get("packet_count", 0) for w in wastage_store.read_all())

    active_anomalies = anomalies_store.query(lambda a: a.get("status") == "active")

    outgoing_user = users_store.get_by_id(req.outgoing_supervisor_id or actor_id)
    incoming_user = users_store.get_by_id(req.incoming_supervisor_id or actor_id)

    handover_id = str(uuid.uuid4())
    doc = {
        "id": handover_id,
        "shift_id": req.shift_id,
        "shift_name": req.shift_name,
        "handover_time": now_iso,
        "outgoing_supervisor": outgoing_user.get("full_name") if outgoing_user else "Supervisor (Outgoing)",
        "incoming_supervisor": incoming_user.get("full_name") if incoming_user else "Supervisor (Incoming)",
        "completed_heads_count": len(completed_heads),
        "missing_heads_count": len(missing_head_ids),
        "missing_head_codes": missing_codes,
        "total_shift_production": total_prod,
        "total_shift_wastage": total_waste,
        "active_anomalies_count": len(active_anomalies),
        "handover_notes": req.handover_notes,
        "status": "completed" if len(missing_head_ids) == 0 else "handover_with_missing_heads"
    }

    shift_handovers_store.insert(doc)

    audit_chain.append_event({
        "event_type": "SHIFT_HANDOVER_EXECUTED",
        "handover_id": handover_id,
        "shift_name": req.shift_name,
        "outgoing_supervisor": doc["outgoing_supervisor"],
        "incoming_supervisor": doc["incoming_supervisor"],
        "missing_heads": missing_codes,
        "timestamp": now_iso
    })

    return ShiftHandoverResponse(**doc)

@router.get("/shift-handover", response_model=List[ShiftHandoverResponse])
def list_shift_handovers(payload: dict = Depends(get_current_user_payload)):
    items = shift_handovers_store.read_all()
    items.sort(key=lambda x: x.get("handover_time", ""), reverse=True)
    return [ShiftHandoverResponse(**x) for x in items]


# 7. Machine Downtime & Interruption Tracking
@router.post("/downtime", response_model=DowntimeLogResponse)
def log_machine_downtime(
    req: DowntimeLogRequest,
    payload: dict = Depends(get_current_user_payload)
):
    actor_id = payload.get("sub", "worker")
    user = users_store.get_by_id(actor_id)
    logged_by = user.get("full_name") if user else "Operator"

    machine = machines_store.get_by_id(req.machine_id)
    if not machine:
        matches = machines_store.query(lambda m: m.get("machine_code") == req.machine_id)
        machine = matches[0] if matches else None
    m_code = machine.get("machine_code") if machine else req.machine_id

    entry_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": entry_id,
        "machine_id": req.machine_id,
        "machine_code": m_code,
        "head_id": req.head_id,
        "interruption_type": req.interruption_type,
        "reason": req.reason,
        "duration_minutes": req.duration_minutes,
        "logged_by": logged_by,
        "created_at": now_iso
    }

    downtime_store.insert(doc)

    audit_chain.append_event({
        "event_type": "MACHINE_DOWNTIME_LOGGED",
        "downtime_id": entry_id,
        "machine_code": m_code,
        "interruption_type": req.interruption_type,
        "duration_minutes": req.duration_minutes,
        "logged_by": logged_by,
        "timestamp": now_iso
    })

    return DowntimeLogResponse(**doc)

@router.get("/downtime", response_model=List[DowntimeLogResponse])
def list_downtime_logs(
    machine_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload)
):
    items = downtime_store.read_all()
    if machine_id:
        items = [i for i in items if i.get("machine_id") == machine_id or i.get("machine_code") == machine_id]
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return [DowntimeLogResponse(**x) for x in items]
