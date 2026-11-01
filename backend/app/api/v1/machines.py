import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.core.permissions import get_current_user_payload
from app.storage.store import (
    machines_store,
    heads_store,
    variants_store,
    shifts_store,
    readings_stream,
    qr_history_store,
)
from app.schemas.schemas import (
    MachineResponse, HeadResponse, VariantResponse, ShiftResponse,
    MachineCreate, MachineUpdate, HeadUpdate,
    MachineQRResponse, QRValidateRequest, QRValidateResponse,
    QRRegenerateRequest, QRRegenerateResponse
)
from app.services.qr_service import (
    PRIMARY_MACHINES_CONFIG,
    get_qr_output_dir,
    generate_single_qr_png,
    generate_printable_pdf_sheet,
    parse_and_validate_qr,
    build_qr_payload
)

router = APIRouter(prefix="/machines", tags=["Machines"])

def _enrich_machine(m: Dict[str, Any]) -> Dict[str, Any]:
    m_copy = dict(m)
    m_id = m_copy.get("id")
    heads = heads_store.query(lambda h: h.get("machine_id") == m_id and h.get("is_active", True))
    
    heads_enriched = []
    for h in heads:
        h_copy = dict(h)
        # get latest reading for head
        h_id = h_copy.get("id")
        latest_readings = readings_stream.read_stream(
            filter_func=lambda r: r.get("head_id") == h_id,
            reverse=True,
            limit=1
        )
        if latest_readings:
            h_copy["latest_counter"] = latest_readings[0].get("confirmed_value", 0)
            h_copy["latest_reading_time"] = latest_readings[0].get("server_time")
        else:
            h_copy["latest_counter"] = h_copy.get("latest_counter", 0)
            h_copy["latest_reading_time"] = h_copy.get("latest_reading_time")
        heads_enriched.append(HeadResponse(**h_copy))
        
    m_copy["heads"] = heads_enriched
    return m_copy


@router.get("", response_model=List[MachineResponse])
def get_machines(payload: dict = Depends(get_current_user_payload)):
    """
    Get all machines (accessible to all authenticated roles: worker, supervisor, official, admin).
    """
    machines = machines_store.query(lambda m: m.get("is_active", True))
    return [_enrich_machine(m) for m in machines]

@router.get("/variants", response_model=List[VariantResponse])
def get_variants(payload: dict = Depends(get_current_user_payload)):
    variants = variants_store.query(lambda v: v.get("is_active", True))
    return [VariantResponse(**v) for v in variants]

@router.get("/shifts", response_model=List[ShiftResponse])
def get_shifts(payload: dict = Depends(get_current_user_payload)):
    shifts = shifts_store.query(lambda s: s.get("is_active", True))
    return [ShiftResponse(**s) for s in shifts]

# -------------------------------------------------------------
# QR Management Endpoints
# -------------------------------------------------------------

@router.get("/qr", response_model=List[MachineQRResponse])
def list_machine_qrs(payload: dict = Depends(get_current_user_payload)):
    """
    Lists all registered machine QR codes with versions, statuses, and download links.
    """
    machines = machines_store.query(lambda m: m.get("is_active", True))
    results = []
    out_dir = get_qr_output_dir()

    for m in machines:
        m_code = m.get("machine_code", "")
        qr_id = m.get("qr_id") or f"QR-00{m_code[-1]}" if m_code and m_code[-1].isdigit() else "QR-001"
        payload_text = m.get("qr_payload") or build_qr_payload(m_code, qr_id, m.get("qr_version", 1))
        
        # Ensure image file exists
        img_file = f"{qr_id}_{m_code}.png"
        img_path = os.path.join(out_dir, img_file)
        if not os.path.exists(img_path):
            generate_single_qr_png(
                qr_id=qr_id,
                machine_id=m_code,
                machine_name=m.get("name", ""),
                machine_type=m.get("machine_type", ""),
                version=m.get("qr_version", 1),
                output_dir=out_dir
            )

        heads = heads_store.query(lambda h: h.get("machine_id") == m.get("id"))

        results.append(MachineQRResponse(
            machine_id=m.get("id"),
            machine_code=m_code,
            machine_name=m.get("name", ""),
            machine_type=m.get("machine_type", ""),
            qr_id=qr_id,
            qr_version=m.get("qr_version", 1),
            qr_status=m.get("qr_status", "active"),
            qr_payload=payload_text,
            head_count=len(heads),
            image_url=f"/api/v1/machines/qr/{qr_id}/image",
            created_at=m.get("created_at"),
            updated_at=m.get("updated_at")
        ))
    return results

@router.get("/qr/{qr_id}/image")
def get_qr_image(qr_id: str):
    """
    Downloads or previews an individual machine QR code PNG.
    """
    machines = machines_store.query(lambda m: m.get("qr_id") == qr_id)
    machine = machines[0] if machines else None
    if not machine:
        cfg = next((c for c in PRIMARY_MACHINES_CONFIG if c["qr_id"] == qr_id), None)
        if cfg:
            matches = machines_store.query(lambda m: m.get("machine_code") == cfg["machine_id"])
            machine = matches[0] if matches else None

    out_dir = get_qr_output_dir()
    m_code = machine.get("machine_code") if machine else qr_id
    img_name = f"{qr_id}_{m_code}.png"
    img_path = os.path.join(out_dir, img_name)

    if not os.path.exists(img_path):
        if machine:
            img_path = generate_single_qr_png(
                qr_id=qr_id,
                machine_id=machine.get("machine_code"),
                machine_name=machine.get("name"),
                machine_type=machine.get("machine_type"),
                version=machine.get("qr_version", 1),
                output_dir=out_dir
            )
        else:
            raise HTTPException(status_code=404, detail="QR image not found for this identifier")

    return FileResponse(img_path, media_type="image/png", filename=img_name)

@router.get("/qr/sheet-pdf")
def get_qr_sticker_sheet():
    """
    Generates and downloads the printable A4 PDF sticker sheet containing all 6 machine QR codes.
    """
    pdf_path = generate_printable_pdf_sheet()
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=500, detail="Could not generate QR PDF sticker sheet")
    return FileResponse(pdf_path, media_type="application/pdf", filename="AAVIN_MACHINE_QR_SHEET.pdf")

@router.post("/qr/validate", response_model=QRValidateResponse)
def validate_scanned_qr(
    req: QRValidateRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Validates scanned QR string, verifies registered active machine, and returns machine details with available heads.
    """
    parsed = parse_and_validate_qr(req.qr_text)
    if not parsed.get("valid"):
        return QRValidateResponse(valid=False, error=parsed.get("error", "Invalid machine QR code"))

    target_code = parsed["machine_id"]
    qr_id = parsed.get("qr_id")

    machines = machines_store.query(lambda m: m.get("machine_code") == target_code)
    machine = machines[0] if machines else None
    if not machine and qr_id:
        qr_matches = machines_store.query(lambda m: m.get("qr_id") == qr_id)
        machine = qr_matches[0] if qr_matches else None

    if not machine:
        for cfg in PRIMARY_MACHINES_CONFIG:
            if cfg["machine_id"] == target_code or cfg["qr_id"] == qr_id:
                cfg_matches = machines_store.query(lambda m: m.get("machine_code") == cfg["machine_id"])
                machine = cfg_matches[0] if cfg_matches else None
                break

    if not machine:
        return QRValidateResponse(valid=False, error=f"Machine {target_code} is not registered in system")

    if not machine.get("is_active", True):
        return QRValidateResponse(valid=False, error=f"Machine {target_code} is currently inactive")

    # Fetch available heads
    heads = heads_store.query(lambda h: h.get("machine_id") == machine.get("id") and h.get("is_active", True))
    heads_resp = []
    for h in heads:
        h_copy = dict(h)
        h_id = h_copy.get("id")
        latest = readings_stream.read_stream(filter_func=lambda r: r.get("head_id") == h_id, reverse=True, limit=1)
        if latest:
            h_copy["latest_counter"] = latest[0].get("confirmed_value", 0)
            h_copy["latest_reading_time"] = latest[0].get("server_time")
        else:
            h_copy["latest_counter"] = h_copy.get("latest_counter", 0)
            h_copy["latest_reading_time"] = h_copy.get("latest_reading_time")
        heads_resp.append(HeadResponse(**h_copy))

    return QRValidateResponse(
        valid=True,
        machine_id=machine.get("id"),
        machine_code=machine.get("machine_code"),
        machine_name=machine.get("name"),
        machine_type=machine.get("machine_type"),
        qr_id=machine.get("qr_id"),
        heads=heads_resp
    )

@router.post("/qr/{qr_id}/regenerate", response_model=QRRegenerateResponse)
def regenerate_machine_qr(
    qr_id: str,
    req: QRRegenerateRequest,
    payload: dict = Depends(get_current_user_payload)
):
    """
    Regenerates a machine QR code through a controlled versioning process with audit logging.
    """
    machines = machines_store.query(lambda m: m.get("qr_id") == qr_id)
    machine = machines[0] if machines else None
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine with QR ID {qr_id} not found")

    old_version = machine.get("qr_version", 1)
    new_version = old_version + 1
    user_name = payload.get("sub", "authorized_user")

    # 1. Log previous version to history
    qr_history_store.append_event({
        "machine_id": machine.get("id"),
        "qr_id": qr_id,
        "version": old_version,
        "payload": machine.get("qr_payload") or build_qr_payload(machine.get("machine_code"), qr_id, old_version),
        "reason": req.reason,
        "created_by": user_name,
        "invalidated_at": datetime.now(timezone.utc).isoformat()
    })

    # 2. Update machine with new version and payload
    new_payload = build_qr_payload(machine.get("machine_code"), qr_id, new_version)
    updated = machines_store.update(machine.get("id"), {
        "qr_version": new_version,
        "qr_payload": new_payload,
        "qr_status": "active",
        "updated_at": datetime.now(timezone.utc).isoformat()
    })

    # 3. Generate updated PNG
    out_dir = get_qr_output_dir()
    generate_single_qr_png(
        qr_id=qr_id,
        machine_id=machine.get("machine_code"),
        machine_name=machine.get("name"),
        machine_type=machine.get("machine_type"),
        version=new_version,
        output_dir=out_dir
    )

    return QRRegenerateResponse(
        success=True,
        machine_id=machine.get("id"),
        qr_id=qr_id,
        version=new_version,
        image_url=f"/api/v1/machines/qr/{qr_id}/image",
        message=f"Machine QR successfully regenerated to version {new_version}. Previous version archived."
    )

@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(
    machine_in: MachineCreate,
    payload: dict = Depends(get_current_user_payload)
):
    existing = machines_store.query(lambda m: m.get("machine_code") == machine_in.machine_code)
    if existing:
        raise HTTPException(status_code=400, detail=f"Machine code '{machine_in.machine_code}' already exists")

    qr_id = machine_in.qr_id or f"QR-{machine_in.machine_code}"
    new_payload = build_qr_payload(machine_in.machine_code, qr_id, 1)

    now = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    doc = {
        "id": new_id,
        "machine_code": machine_in.machine_code,
        "name": machine_in.name,
        "machine_type": machine_in.machine_type,
        "total_heads": machine_in.total_heads,
        "qr_id": qr_id,
        "qr_version": 1,
        "qr_payload": new_payload,
        "qr_status": "active",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    machines_store.insert(doc)

    generate_single_qr_png(
        qr_id=qr_id,
        machine_id=machine_in.machine_code,
        machine_name=machine_in.name,
        machine_type=machine_in.machine_type,
        version=1
    )

    return _enrich_machine(doc)

@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(
    machine_id: str,
    machine_in: MachineUpdate,
    payload: dict = Depends(get_current_user_payload)
):
    machine = machines_store.get_by_id(machine_id)
    if not machine:
        matches = machines_store.query(lambda m: m.get("machine_code") == machine_id)
        machine = matches[0] if matches else None
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    updates: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if machine_in.name is not None:
        updates["name"] = machine_in.name
    if machine_in.machine_code is not None:
        updates["machine_code"] = machine_in.machine_code
    if machine_in.machine_type is not None:
        updates["machine_type"] = machine_in.machine_type
    if machine_in.total_heads is not None:
        updates["total_heads"] = machine_in.total_heads
    if machine_in.is_active is not None:
        updates["is_active"] = machine_in.is_active

    updated = machines_store.update(machine.get("id"), updates)
    return _enrich_machine(updated)

@router.put("/heads/{head_id}", response_model=HeadResponse)
def update_head(
    head_id: str,
    head_in: HeadUpdate,
    payload: dict = Depends(get_current_user_payload)
):
    head = heads_store.get_by_id(head_id)
    if not head:
        matches = heads_store.query(lambda h: h.get("head_code") == head_id)
        head = matches[0] if matches else None
    if not head:
        raise HTTPException(status_code=404, detail="Head not found")

    updates: Dict[str, Any] = {}
    if head_in.rated_speed_per_hour is not None:
        updates["rated_speed_per_hour"] = head_in.rated_speed_per_hour
    if head_in.is_active is not None:
        updates["is_active"] = head_in.is_active
    if head_in.head_number is not None:
        updates["head_number"] = head_in.head_number

    updated = heads_store.update(head.get("id"), updates)
    return HeadResponse(**updated)

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, payload: dict = Depends(get_current_user_payload)):
    machine = machines_store.get_by_id(machine_id)
    if not machine:
        matches = machines_store.query(lambda m: m.get("machine_code") == machine_id)
        machine = matches[0] if matches else None
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return _enrich_machine(machine)

@router.get("/{machine_id}/heads", response_model=List[HeadResponse])
def get_machine_heads(machine_id: str, payload: dict = Depends(get_current_user_payload)):
    machine = machines_store.get_by_id(machine_id)
    if not machine:
        matches = machines_store.query(lambda m: m.get("machine_code") == machine_id)
        machine = matches[0] if matches else None
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    m_id = machine.get("id")
    heads = heads_store.query(lambda h: h.get("machine_id") == m_id and h.get("is_active", True))
    heads_resp = []
    for h in heads:
        h_copy = dict(h)
        h_id = h_copy.get("id")
        latest = readings_stream.read_stream(filter_func=lambda r: r.get("head_id") == h_id, reverse=True, limit=1)
        if latest:
            h_copy["latest_counter"] = latest[0].get("confirmed_value", 0)
            h_copy["latest_reading_time"] = latest[0].get("server_time")
        else:
            h_copy["latest_counter"] = h_copy.get("latest_counter", 0)
            h_copy["latest_reading_time"] = h_copy.get("latest_reading_time")
        heads_resp.append(HeadResponse(**h_copy))
    return heads_resp
