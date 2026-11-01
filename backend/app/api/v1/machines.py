import os
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import get_current_user_payload
from app.models.machine import Machine, Head, Variant, Shift, MachineQRHistory
from app.models.reading import Reading
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
    generate_all_machine_qrs,
    generate_printable_pdf_sheet,
    parse_and_validate_qr,
    build_qr_payload
)

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    """
    Get all machines (accessible to all authenticated roles: worker, supervisor, official, admin).
    """
    machines = db.query(Machine).filter(Machine.is_active == True).all()
    # Enrich head latest reading info
    for m in machines:
        for h in m.heads:
            latest_read = db.query(Reading).filter(Reading.head_id == h.id).order_by(Reading.server_time.desc()).first()
            if latest_read:
                h.latest_counter = latest_read.confirmed_value
                h.latest_reading_time = latest_read.server_time
    return machines

@router.get("/variants", response_model=List[VariantResponse])
def get_variants(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    variants = db.query(Variant).filter(Variant.is_active == True).all()
    return variants

@router.get("/shifts", response_model=List[ShiftResponse])
def get_shifts(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    shifts = db.query(Shift).filter(Shift.is_active == True).all()
    return shifts

# -------------------------------------------------------------
# QR Management Endpoints
# -------------------------------------------------------------

@router.get("/qr", response_model=List[MachineQRResponse])
def list_machine_qrs(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    """
    Lists all registered machine QR codes with versions, statuses, and download links.
    """
    machines = db.query(Machine).filter(Machine.is_active == True).all()
    results = []
    out_dir = get_qr_output_dir()

    for m in machines:
        qr_id = m.qr_id or f"QR-00{m.machine_code[-1]}" if m.machine_code[-1].isdigit() else "QR-001"
        payload_text = m.qr_payload or build_qr_payload(m.machine_code, qr_id, m.qr_version or 1)
        
        # Ensure image file exists
        img_file = f"{qr_id}_{m.machine_code}.png"
        img_path = os.path.join(out_dir, img_file)
        if not os.path.exists(img_path):
            generate_single_qr_png(
                qr_id=qr_id,
                machine_id=m.machine_code,
                machine_name=m.name,
                machine_type=m.machine_type,
                version=m.qr_version or 1,
                output_dir=out_dir
            )

        results.append(MachineQRResponse(
            machine_id=m.id,
            machine_code=m.machine_code,
            machine_name=m.name,
            machine_type=m.machine_type,
            qr_id=qr_id,
            qr_version=m.qr_version or 1,
            qr_status=m.qr_status or "active",
            qr_payload=payload_text,
            head_count=len(m.heads),
            image_url=f"/api/v1/machines/qr/{qr_id}/image",
            created_at=m.created_at,
            updated_at=m.updated_at
        ))
    return results

@router.get("/qr/{qr_id}/image")
def get_qr_image(qr_id: str, db: Session = Depends(get_db)):
    """
    Downloads or previews an individual machine QR code PNG.
    """
    machine = db.query(Machine).filter(Machine.qr_id == qr_id).first()
    if not machine:
        # Fallback search by config
        cfg = next((c for c in PRIMARY_MACHINES_CONFIG if c["qr_id"] == qr_id), None)
        if cfg:
            machine = db.query(Machine).filter(Machine.machine_code == cfg["machine_id"]).first()

    out_dir = get_qr_output_dir()
    img_name = f"{qr_id}_{machine.machine_code if machine else qr_id}.png"
    img_path = os.path.join(out_dir, img_name)

    if not os.path.exists(img_path):
        if machine:
            img_path = generate_single_qr_png(
                qr_id=qr_id,
                machine_id=machine.machine_code,
                machine_name=machine.name,
                machine_type=machine.machine_type,
                version=machine.qr_version or 1,
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
    db: Session = Depends(get_db),
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

    machine = db.query(Machine).filter(Machine.machine_code == target_code).first()
    if not machine and qr_id:
        machine = db.query(Machine).filter(Machine.qr_id == qr_id).first()

    # Legacy alias support
    if not machine:
        for cfg in PRIMARY_MACHINES_CONFIG:
            if cfg["machine_id"] == target_code or cfg["qr_id"] == qr_id:
                machine = db.query(Machine).filter(Machine.machine_code == cfg["machine_id"]).first()
                break

    if not machine:
        return QRValidateResponse(valid=False, error=f"Machine {target_code} is not registered in central database")

    if not machine.is_active:
        return QRValidateResponse(valid=False, error=f"Machine {target_code} is currently inactive")

    # Fetch available heads and latest counters
    heads_resp = []
    for h in machine.heads:
        if h.is_active:
            latest = db.query(Reading).filter(Reading.head_id == h.id).order_by(Reading.server_time.desc()).first()
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
                "latest_counter": latest.confirmed_value if latest else 0,
                "latest_reading_time": latest.server_time if latest else None
            }
            heads_resp.append(HeadResponse(**h_dict))

    return QRValidateResponse(
        valid=True,
        machine_id=machine.id,
        machine_code=machine.machine_code,
        machine_name=machine.name,
        machine_type=machine.machine_type,
        qr_id=machine.qr_id,
        heads=heads_resp
    )

@router.post("/qr/{qr_id}/regenerate", response_model=QRRegenerateResponse)
def regenerate_machine_qr(
    qr_id: str,
    req: QRRegenerateRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Regenerates a machine QR code through a controlled versioning process with audit logging.
    """
    machine = db.query(Machine).filter(Machine.qr_id == qr_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine with QR ID {qr_id} not found")

    old_version = machine.qr_version or 1
    new_version = old_version + 1
    user_name = payload.get("sub", "authorized_user")

    # 1. Log previous version to history
    history = MachineQRHistory(
        machine_id=machine.id,
        qr_id=qr_id,
        version=old_version,
        payload=machine.qr_payload or build_qr_payload(machine.machine_code, qr_id, old_version),
        reason=req.reason,
        created_by=user_name,
        invalidated_at=datetime.now(timezone.utc)
    )
    db.add(history)

    # 2. Update machine with new version and payload
    new_payload = build_qr_payload(machine.machine_code, qr_id, new_version)
    machine.qr_version = new_version
    machine.qr_payload = new_payload
    machine.qr_status = "active"
    db.commit()
    db.refresh(machine)

    # 3. Generate updated PNG
    out_dir = get_qr_output_dir()
    generate_single_qr_png(
        qr_id=qr_id,
        machine_id=machine.machine_code,
        machine_name=machine.name,
        machine_type=machine.machine_type,
        version=new_version,
        output_dir=out_dir
    )

    return QRRegenerateResponse(
        success=True,
        machine_id=machine.id,
        qr_id=qr_id,
        version=new_version,
        image_url=f"/api/v1/machines/qr/{qr_id}/image",
        message=f"Machine QR successfully regenerated to version {new_version}. Previous version archived."
    )

# -------------------------------------------------------------
# Machine & Head CRUD (Editable by ALL authenticated role users)
# -------------------------------------------------------------

@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(
    machine_in: MachineCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Create a new machine. Editable by all role users (worker, supervisor, official, admin).
    """
    existing = db.query(Machine).filter(Machine.machine_code == machine_in.machine_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Machine code '{machine_in.machine_code}' already exists")

    qr_id = machine_in.qr_id or f"QR-{machine_in.machine_code}"
    new_payload = build_qr_payload(machine_in.machine_code, qr_id, 1)

    machine = Machine(
        machine_code=machine_in.machine_code,
        name=machine_in.name,
        machine_type=machine_in.machine_type,
        total_heads=machine_in.total_heads,
        qr_id=qr_id,
        qr_version=1,
        qr_payload=new_payload,
        qr_status="active",
        is_active=True
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)

    # Generate QR PNG
    generate_single_qr_png(
        qr_id=qr_id,
        machine_id=machine.machine_code,
        machine_name=machine.name,
        machine_type=machine.machine_type,
        version=1
    )

    return machine

@router.put("/{machine_id}", response_model=MachineResponse)
def update_machine(
    machine_id: str,
    machine_in: MachineUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Update machine metadata. Editable by all role users (worker, supervisor, official, admin).
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        machine = db.query(Machine).filter(Machine.machine_code == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    if machine_in.name is not None:
        machine.name = machine_in.name
    if machine_in.machine_code is not None:
        machine.machine_code = machine_in.machine_code
    if machine_in.machine_type is not None:
        machine.machine_type = machine_in.machine_type
    if machine_in.total_heads is not None:
        machine.total_heads = machine_in.total_heads
    if machine_in.is_active is not None:
        machine.is_active = machine_in.is_active

    db.commit()
    db.refresh(machine)
    return machine

@router.put("/heads/{head_id}", response_model=HeadResponse)
def update_head(
    head_id: str,
    head_in: HeadUpdate,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    """
    Update head configuration. Editable by all role users (worker, supervisor, official, admin).
    """
    head = db.query(Head).filter(Head.id == head_id).first()
    if not head:
        head = db.query(Head).filter(Head.head_code == head_id).first()
    if not head:
        raise HTTPException(status_code=404, detail="Head not found")

    if head_in.rated_speed_per_hour is not None:
        head.rated_speed_per_hour = head_in.rated_speed_per_hour
    if head_in.is_active is not None:
        head.is_active = head_in.is_active
    if head_in.head_number is not None:
        head.head_number = head_in.head_number

    db.commit()
    db.refresh(head)
    return head

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        machine = db.query(Machine).filter(Machine.machine_code == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@router.get("/{machine_id}/heads", response_model=List[HeadResponse])
def get_machine_heads(machine_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        machine = db.query(Machine).filter(Machine.machine_code == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    heads = db.query(Head).filter(Head.machine_id == machine.id, Head.is_active == True).all()
    for h in heads:
        latest = db.query(Reading).filter(Reading.head_id == h.id).order_by(Reading.server_time.desc()).first()
        if latest:
            h.latest_counter = latest.confirmed_value
            h.latest_reading_time = latest.server_time
    return heads
