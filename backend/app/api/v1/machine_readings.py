import os
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.config import settings
from app.core.permissions import get_current_user_payload, require_permission
from app.models.auth import User
from app.models.machine import Machine, Head, Variant
from app.models.reading import Reading
from app.models.display_evidence import MachineDisplayEvidence, MachineReadingOCR
from app.models.integrity import IdempotencyRecord, Anomaly
from app.schemas.schemas import (
    EvidenceUploadResponse,
    MachineDisplayReadingSubmitRequest,
    MachineReadingOCRResponse,
    MachineDisplayEvidenceResponse,
)
from app.services.reading_service import ReadingService
from app.services.time_integrity_service import ensure_utc

router = APIRouter(prefix="/machine-readings", tags=["Machine Readings & Display Evidence"])

# Storage directory for private evidence images
EVIDENCE_STORAGE_DIR = Path("backend/storage/evidence")
EVIDENCE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/evidence", response_model=EvidenceUploadResponse)
async def upload_machine_display_evidence(
    image: UploadFile = File(...),
    machine_id: str = Form(...),
    qr_id: Optional[str] = Form(None),
    shift_id: Optional[str] = Form(None),
    captured_at: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("reading.capture")),
):
    """
    Accepts captured HMI machine display photograph.
    Computes cryptographic SHA-256 hash, stores securely in protected storage,
    and returns evidence metadata.
    """
    worker_id = payload.get("sub")

    # 1. Idempotency Check
    if idempotency_key:
        cached = db.query(IdempotencyRecord).filter(
            IdempotencyRecord.idempotency_key == idempotency_key
        ).first()
        if cached and cached.response_body:
            ev_id = cached.response_body.get("evidence_id")
            existing_ev = db.query(MachineDisplayEvidence).filter(MachineDisplayEvidence.id == ev_id).first()
            if existing_ev:
                return EvidenceUploadResponse(
                    evidence_id=existing_ev.id,
                    evidence_uuid=existing_ev.evidence_uuid,
                    machine_id=existing_ev.machine_id,
                    qr_id=existing_ev.qr_id,
                    image_sha256=existing_ev.image_sha256,
                    upload_status=existing_ev.upload_status,
                    file_size=existing_ev.file_size,
                    server_received_at=existing_ev.server_received_at,
                    image_url=f"/api/v1/machine-readings/evidence/{existing_ev.id}/image",
                )

    # 2. Validate MIME type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    mime_type = image.content_type or "image/jpeg"
    if mime_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {mime_type}. Allowed: JPEG, PNG, WebP.",
        )

    # 3. Read image bytes and validate size
    image_bytes = await image.read()
    file_size = len(image_bytes)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")
    if file_size > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image exceeds maximum 25MB threshold")

    # 4. Calculate SHA-256
    image_sha256 = hashlib.sha256(image_bytes).hexdigest()

    # 5. Check for duplicate image hash (Audit Alert)
    duplicate_evidence = db.query(MachineDisplayEvidence).filter(
        MachineDisplayEvidence.image_sha256 == image_sha256
    ).first()

    # 6. Resolve Machine (supports machine_code like 'SMP-01' or UUID)
    machine = db.query(Machine).filter(
        (Machine.id == machine_id) | (Machine.machine_code == machine_id)
    ).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")

    # 7. Save file to protected evidence storage
    now = datetime.now(timezone.utc)
    year_month_dir = EVIDENCE_STORAGE_DIR / f"{now.year}" / f"{now.month:02d}"
    year_month_dir.mkdir(parents=True, exist_ok=True)

    evidence_uuid = str(uuid.uuid4())
    ext = "jpg" if "jpeg" in mime_type or "jpg" in mime_type else "png"
    stored_filename = f"{evidence_uuid}.{ext}"
    stored_path = year_month_dir / stored_filename

    with open(stored_path, "wb") as f:
        f.write(image_bytes)

    # 8. Parse capture time
    cap_time = now
    if captured_at:
        try:
            cap_time = ensure_utc(datetime.fromisoformat(captured_at.replace("Z", "+00:00")))
        except Exception:
            cap_time = now

    # 9. Create Evidence Database Record
    evidence = MachineDisplayEvidence(
        evidence_uuid=evidence_uuid,
        machine_id=machine.id,
        qr_id=qr_id or machine.qr_id,
        shift_id=shift_id,
        worker_id=worker_id,
        original_image_path=str(stored_path.as_posix()),
        original_filename=image.filename or stored_filename,
        mime_type=mime_type,
        file_size=file_size,
        image_sha256=image_sha256,
        captured_at=cap_time,
        server_received_at=now,
        upload_status="uploaded",
        verification_status="duplicate_flagged" if duplicate_evidence else "pending",
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # 10. Record duplicate anomaly if applicable
    if duplicate_evidence:
        anomaly = Anomaly(
            machine_id=machine.id,
            anomaly_type="duplicate_image",
            severity="High",
            description=(
                f"Identical HMI image SHA-256 ({image_sha256[:16]}...) was previously uploaded "
                f"under evidence ID {duplicate_evidence.id}."
            ),
            detection_time=now,
            status="active",
        )
        db.add(anomaly)
        db.commit()

    # 11. Idempotency record
    if idempotency_key:
        rec = IdempotencyRecord(
            idempotency_key=idempotency_key,
            endpoint="/api/v1/machine-readings/evidence",
            response_code=200,
            response_body={
                "evidence_id": evidence.id,
                "evidence_uuid": evidence.evidence_uuid,
                "image_sha256": evidence.image_sha256,
            },
        )
        db.add(rec)
        db.commit()

    return EvidenceUploadResponse(
        evidence_id=evidence.id,
        evidence_uuid=evidence.evidence_uuid,
        machine_id=machine.machine_code,
        qr_id=evidence.qr_id,
        image_sha256=evidence.image_sha256,
        upload_status=evidence.upload_status,
        file_size=evidence.file_size,
        server_received_at=evidence.server_received_at,
        image_url=f"/api/v1/machine-readings/evidence/{evidence.id}/image",
    )


@router.post("", response_model=List[MachineReadingOCRResponse])
def submit_machine_display_readings(
    req: MachineDisplayReadingSubmitRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("reading.capture")),
):
    """
    Submits worker-confirmed readings for visible heads captured in the HMI photograph.
    Links both Head A and Head B to the single evidence record and commits to the
    cryptographic hash chain.
    """
    worker_id = payload.get("sub")

    # 1. Fetch Evidence Record
    evidence = db.query(MachineDisplayEvidence).filter(
        MachineDisplayEvidence.id == req.evidence_id
    ).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Machine display evidence not found")

    # Read original photo bytes from protected storage for hash chain link
    if not os.path.exists(evidence.original_image_path):
        raise HTTPException(status_code=500, detail="Stored evidence file is missing from protected storage")
    with open(evidence.original_image_path, "rb") as f:
        photo_bytes = f.read()

    # 2. Fetch Machine
    machine = db.query(Machine).filter(
        (Machine.id == req.machine_id) | (Machine.machine_code == req.machine_id)
    ).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # 3. Default Variant
    default_variant = db.query(Variant).filter(Variant.code == "TM-500").first()
    if not default_variant:
        default_variant = db.query(Variant).first()

    created_ocr_records = []
    has_corrections = False

    # 4. Process each Head Reading (Head A and Head B)
    for hr in req.head_readings:
        # Resolve Head: by head_id or head_number
        head = None
        if hr.head_id:
            head = db.query(Head).filter(
                (Head.id == hr.head_id) | (Head.head_code == hr.head_id)
            ).first()
        if not head:
            head = db.query(Head).filter(
                Head.machine_id == machine.id,
                Head.head_number == hr.head_number
            ).first()
        if not head:
            # Fallback to any head matching head_number
            head = db.query(Head).filter(Head.head_number == hr.head_number).first()
        if not head:
            raise HTTPException(status_code=400, detail=f"Head {hr.head_number} not found for machine {machine.machine_code}")

        # Resolve Variant
        variant = None
        if hr.variant_confirmed_value:
            # match 1000ml -> TM-1000 or similar
            vol_str = "".join(filter(str.isdigit, hr.variant_confirmed_value))
            if vol_str:
                variant = db.query(Variant).filter(Variant.pouch_volume_ml == int(vol_str)).first()
        if not variant and hr.variant_id:
            variant = db.query(Variant).filter(Variant.id == hr.variant_id).first()
        if not variant:
            variant = default_variant

        # Check if correction occurred
        is_corrected = (
            (hr.production_ocr_value is not None and hr.production_ocr_value != hr.production_confirmed_value) or
            (hr.wastage_ocr_value is not None and hr.wastage_ocr_value != hr.wastage_confirmed_value) or
            (hr.correction_status == "corrected")
        )
        if is_corrected:
            has_corrections = True

        # Call authoritative ReadingService to record into hash chain
        reading = ReadingService.submit_reading(
            db=db,
            machine_id=machine.id,
            head_id=head.id,
            variant_id=variant.id if variant else default_variant.id,
            user_id=worker_id,
            count=hr.production_confirmed_value,
            ocr_value=hr.production_ocr_value,
            confirmed_value=hr.production_confirmed_value,
            ocr_confidence=hr.ocr_confidence or 1.0,
            device_time=req.device_time,
            device_monotonic_ms=req.device_monotonic_ms or 0,
            device_boot_id=req.device_boot_id or "unknown_boot",
            source="machine_display_ocr",
            photo_bytes=photo_bytes,
            capture_device_id=req.device_id,
            slot_id=None,
        )

        # Create MachineReadingOCR record
        head_label = hr.head_label or ("HEAD - A" if hr.head_number == 1 else "HEAD - B")
        ocr_rec = MachineReadingOCR(
            evidence_id=evidence.id,
            machine_id=machine.id,
            head_id=head.id,
            head_number=hr.head_number,
            head_label=head_label,
            production_ocr_value=hr.production_ocr_value,
            wastage_ocr_value=hr.wastage_ocr_value,
            variant_ocr_value=hr.variant_ocr_value,
            machine_speed_ocr=hr.machine_speed_ocr,
            feed_time_ocr=hr.feed_time_ocr,
            recipe_no_ocr=hr.recipe_no_ocr,
            production_confirmed_value=hr.production_confirmed_value,
            wastage_confirmed_value=hr.wastage_confirmed_value,
            variant_confirmed_value=hr.variant_confirmed_value,
            raw_ocr_response=req.raw_ocr_response,
            ocr_confidence=hr.ocr_confidence or 1.0,
            correction_status="corrected" if is_corrected else "original",
            correction_reason=hr.correction_reason if is_corrected else None,
            reading_id=reading.id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(ocr_rec)
        created_ocr_records.append(ocr_rec)

    # 5. Update Evidence Verification Status
    evidence.verification_status = "verified_with_corrections" if has_corrections else "verified"
    db.commit()

    for rec in created_ocr_records:
        db.refresh(rec)

    return created_ocr_records


@router.get("/evidence", response_model=List[MachineDisplayEvidenceResponse])
def list_machine_display_evidence(
    machine_id: Optional[str] = Query(None),
    shift_id: Optional[str] = Query(None),
    worker_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload),
):
    """
    List all uploaded HMI display photographs with linked dual-head readings,
    supporting official auditing and filtering.
    """
    query = db.query(MachineDisplayEvidence)
    if machine_id:
        m = db.query(Machine).filter(
            (Machine.id == machine_id) | (Machine.machine_code == machine_id)
        ).first()
        if m:
            query = query.filter(MachineDisplayEvidence.machine_id == m.id)
    if shift_id:
        query = query.filter(MachineDisplayEvidence.shift_id == shift_id)
    if worker_id:
        query = query.filter(MachineDisplayEvidence.worker_id == worker_id)

    records = (
        query.order_by(MachineDisplayEvidence.captured_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    results = []
    for r in records:
        machine = db.query(Machine).filter(Machine.id == r.machine_id).first()
        worker = db.query(User).filter(User.id == r.worker_id).first()
        ocr_items = (
            db.query(MachineReadingOCR)
            .filter(MachineReadingOCR.evidence_id == r.id)
            .order_by(MachineReadingOCR.head_number.asc())
            .all()
        )

        results.append(
            MachineDisplayEvidenceResponse(
                id=r.id,
                evidence_uuid=r.evidence_uuid,
                machine_id=r.machine_id,
                machine_code=machine.machine_code if machine else None,
                machine_name=machine.name if machine else None,
                qr_id=r.qr_id,
                shift_id=r.shift_id,
                worker_id=r.worker_id,
                worker_name=worker.full_name if worker else None,
                mime_type=r.mime_type,
                file_size=r.file_size,
                image_sha256=r.image_sha256,
                captured_at=r.captured_at,
                server_received_at=r.server_received_at,
                upload_status=r.upload_status,
                verification_status=r.verification_status,
                image_url=f"/api/v1/machine-readings/evidence/{r.id}/image",
                head_readings=[
                    MachineReadingOCRResponse.model_validate(item) for item in ocr_items
                ],
                created_at=r.created_at,
            )
        )
    return results


@router.get("/evidence/{evidence_id}", response_model=MachineDisplayEvidenceResponse)
def get_machine_display_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload),
):
    """
    Fetch a single HMI display evidence record with complete dual-head readings.
    """
    r = db.query(MachineDisplayEvidence).filter(
        (MachineDisplayEvidence.id == evidence_id) | (MachineDisplayEvidence.evidence_uuid == evidence_id)
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    machine = db.query(Machine).filter(Machine.id == r.machine_id).first()
    worker = db.query(User).filter(User.id == r.worker_id).first()
    ocr_items = (
        db.query(MachineReadingOCR)
        .filter(MachineReadingOCR.evidence_id == r.id)
        .order_by(MachineReadingOCR.head_number.asc())
        .all()
    )

    return MachineDisplayEvidenceResponse(
        id=r.id,
        evidence_uuid=r.evidence_uuid,
        machine_id=r.machine_id,
        machine_code=machine.machine_code if machine else None,
        machine_name=machine.name if machine else None,
        qr_id=r.qr_id,
        shift_id=r.shift_id,
        worker_id=r.worker_id,
        worker_name=worker.full_name if worker else None,
        mime_type=r.mime_type,
        file_size=r.file_size,
        image_sha256=r.image_sha256,
        captured_at=r.captured_at,
        server_received_at=r.server_received_at,
        upload_status=r.upload_status,
        verification_status=r.verification_status,
        image_url=f"/api/v1/machine-readings/evidence/{r.id}/image",
        head_readings=[
            MachineReadingOCRResponse.model_validate(item) for item in ocr_items
        ],
        created_at=r.created_at,
    )


@router.get("/evidence/{evidence_id}/image")
def get_machine_display_evidence_image(
    evidence_id: str,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Stream full-resolution original captured HMI photograph from protected private storage.
    """
    r = db.query(MachineDisplayEvidence).filter(
        (MachineDisplayEvidence.id == evidence_id) | (MachineDisplayEvidence.evidence_uuid == evidence_id)
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    file_path = Path(r.original_image_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Physical evidence image file not found")

    return FileResponse(
        path=str(file_path),
        media_type=r.mime_type,
        filename=r.original_filename,
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
            "X-Evidence-SHA256": r.image_sha256,
        },
    )
