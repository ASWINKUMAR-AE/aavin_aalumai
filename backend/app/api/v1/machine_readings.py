import os
import uuid
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse

from app.core.permissions import get_current_user_payload, require_permission
from app.storage.store import (
    machines_store,
    heads_store,
    variants_store,
    users_store,
    evidence_storage,
    machine_ocr_stream,
    idempotency_store,
    readings_stream,
)
from app.schemas.schemas import (
    EvidenceUploadResponse,
    MachineDisplayReadingSubmitRequest,
    MachineReadingOCRResponse,
    MachineDisplayEvidenceResponse,
)
from app.services.reading_service import ReadingService
from app.services.anomaly_service import AnomalyService
from app.services.time_integrity_service import ensure_utc

router = APIRouter(prefix="/machine-readings", tags=["Machine Readings & Display Evidence"])


@router.post("/evidence", response_model=EvidenceUploadResponse)
async def upload_machine_display_evidence(
    image: UploadFile = File(...),
    machine_id: str = Form(...),
    qr_id: Optional[str] = Form(None),
    shift_id: Optional[str] = Form(None),
    captured_at: Optional[str] = Form(None),
    device_id: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Form(None),
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
        cached = idempotency_store.get_by_id(idempotency_key)
        if cached and cached.get("response_body"):
            body = cached["response_body"]
            ev_id = body.get("evidence_id")
            existing_ev = evidence_storage.get_by_id(ev_id)
            if existing_ev:
                return EvidenceUploadResponse(
                    evidence_id=existing_ev["evidence_id"],
                    evidence_uuid=existing_ev["evidence_uuid"],
                    machine_id=existing_ev["machine_id"],
                    qr_id=existing_ev.get("qr_id"),
                    image_sha256=existing_ev["image_sha256"],
                    upload_status=existing_ev["upload_status"],
                    file_size=existing_ev["file_size"],
                    server_received_at=existing_ev["server_received_at"],
                    image_url=f"/api/v1/machine-readings/evidence/{existing_ev['evidence_id']}/image",
                )

    # 2. Validate MIME type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    mime_type = image.content_type or "image/jpeg"
    if mime_type.lower() not in allowed_types:
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

    # 4. Resolve Machine
    machine = machines_store.get_by_id(machine_id)
    if not machine:
        matches = machines_store.query(lambda m: m.get("machine_code") == machine_id)
        machine = matches[0] if matches else None
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found.")

    # 5. Parse capture time
    cap_time = datetime.now(timezone.utc)
    if captured_at:
        try:
            cap_time = ensure_utc(datetime.fromisoformat(captured_at.replace("Z", "+00:00")))
        except Exception:
            cap_time = datetime.now(timezone.utc)

    # 6. Save file to evidence storage with SHA-256 verification
    manifest_entry = evidence_storage.save_evidence(
        image_bytes=image_bytes,
        original_filename=image.filename or "display_capture.jpg",
        mime_type=mime_type,
        machine_id=machine.get("machine_code"),
        qr_id=qr_id or machine.get("qr_id"),
        shift_id=shift_id,
        worker_id=worker_id,
        captured_at=cap_time,
        device_id=device_id,
    )

    # 7. Record duplicate anomaly if applicable
    if manifest_entry.get("is_duplicate"):
        AnomalyService.create_anomaly(
            anomaly_type="duplicate_image",
            severity="High",
            description=f"Identical HMI image SHA-256 ({manifest_entry['image_sha256'][:16]}...) was previously uploaded under evidence ID {manifest_entry.get('duplicate_of_id')}.",
            machine_id=machine.get("id"),
        )

    # 8. Record Idempotency
    if idempotency_key:
        idempotency_store.upsert({
            "idempotency_key": idempotency_key,
            "endpoint": "/api/v1/machine-readings/evidence",
            "response_code": 200,
            "response_body": {
                "evidence_id": manifest_entry["evidence_id"],
                "evidence_uuid": manifest_entry["evidence_uuid"],
                "image_sha256": manifest_entry["image_sha256"],
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return EvidenceUploadResponse(
        evidence_id=manifest_entry["evidence_id"],
        evidence_uuid=manifest_entry["evidence_uuid"],
        machine_id=machine.get("machine_code"),
        qr_id=manifest_entry.get("qr_id"),
        image_sha256=manifest_entry["image_sha256"],
        upload_status=manifest_entry["upload_status"],
        file_size=manifest_entry["file_size"],
        server_received_at=manifest_entry["server_received_at"],
        image_url=f"/api/v1/machine-readings/evidence/{manifest_entry['evidence_id']}/image",
    )


@router.post("", response_model=List[MachineReadingOCRResponse])
def submit_machine_display_readings(
    req: MachineDisplayReadingSubmitRequest,
    payload: dict = Depends(require_permission("reading.capture")),
):
    """
    Submits worker-confirmed readings for visible heads captured in the HMI photograph.
    Links both Head A and Head B to the single evidence record and commits to the
    cryptographic hash chain.
    """
    worker_id = payload.get("sub")

    # 1. Fetch Evidence Record
    evidence = evidence_storage.get_by_id(req.evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Machine display evidence not found")

    image_path = evidence.get("absolute_path")
    if not image_path or not os.path.exists(image_path):
        raise HTTPException(status_code=500, detail="Stored evidence file is missing from protected storage")
    with open(image_path, "rb") as f:
        photo_bytes = f.read()

    # 2. Fetch Machine
    machine = machines_store.get_by_id(req.machine_id)
    if not machine:
        matches = machines_store.query(lambda m: m.get("machine_code") == req.machine_id)
        machine = matches[0] if matches else None
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    m_id = machine.get("id")

    # 3. Default Variant
    default_variants = variants_store.query(lambda v: v.get("code") == "TM-500")
    default_variant = default_variants[0] if default_variants else (variants_store.read_all()[0] if variants_store.read_all() else {"id": "var-1", "code": "TM-500"})

    created_ocr_records = []

    # 4. Process each Head Reading (Head A and Head B)
    for hr in req.head_readings:
        head = None
        if hr.head_id:
            head = heads_store.get_by_id(hr.head_id)
            if not head:
                matches = heads_store.query(lambda h: h.get("head_code") == hr.head_id)
                head = matches[0] if matches else None
        if not head:
            matches = heads_store.query(lambda h: h.get("machine_id") == m_id and h.get("head_number") == hr.head_number)
            head = matches[0] if matches else None
        if not head:
            matches = heads_store.query(lambda h: h.get("head_number") == hr.head_number)
            head = matches[0] if matches else None
        if not head:
            raise HTTPException(status_code=400, detail=f"Head {hr.head_number} not found for machine {machine.get('machine_code')}")

        # Resolve Variant
        variant = None
        if hr.variant_confirmed_value:
            vol_str = "".join(filter(str.isdigit, hr.variant_confirmed_value))
            if vol_str:
                matches = variants_store.query(lambda v: v.get("pouch_volume_ml") == int(vol_str))
                variant = matches[0] if matches else None
        if not variant and hr.variant_id:
            variant = variants_store.get_by_id(hr.variant_id)
        if not variant:
            variant = default_variant

        is_corrected = (
            (hr.production_ocr_value is not None and hr.production_ocr_value != hr.production_confirmed_value) or
            (hr.wastage_ocr_value is not None and hr.wastage_ocr_value != hr.wastage_confirmed_value) or
            (hr.correction_status == "corrected")
        )

        # Call ReadingService to record into hash chain
        reading = ReadingService.submit_reading(
            machine_id=machine.get("id"),
            head_id=head.get("id"),
            variant_id=variant.get("id"),
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

        ocr_id = str(uuid.uuid4())
        head_label = hr.head_label or ("HEAD - A" if hr.head_number == 1 else "HEAD - B")
        now_str = datetime.now(timezone.utc).isoformat()
        
        ocr_doc = {
            "id": ocr_id,
            "evidence_id": evidence.get("evidence_id"),
            "machine_id": machine.get("id"),
            "head_id": head.get("id"),
            "head_number": hr.head_number,
            "head_label": head_label,
            "production_ocr_value": hr.production_ocr_value,
            "wastage_ocr_value": hr.wastage_ocr_value,
            "variant_ocr_value": hr.variant_ocr_value,
            "machine_speed_ocr": hr.machine_speed_ocr,
            "feed_time_ocr": hr.feed_time_ocr,
            "recipe_no_ocr": hr.recipe_no_ocr,
            "production_confirmed_value": hr.production_confirmed_value,
            "wastage_confirmed_value": hr.wastage_confirmed_value or 0,
            "variant_confirmed_value": hr.variant_confirmed_value,
            "raw_ocr_response": req.raw_ocr_response,
            "ocr_confidence": hr.ocr_confidence or 1.0,
            "correction_status": "corrected" if is_corrected else "original",
            "correction_reason": hr.correction_reason if is_corrected else None,
            "reading_id": reading.get("id"),
            "created_at": now_str,
        }
        machine_ocr_stream.append_event(ocr_doc)
        created_ocr_records.append(MachineReadingOCRResponse(**ocr_doc))

    return created_ocr_records


@router.get("/evidence", response_model=List[MachineDisplayEvidenceResponse])
def list_machine_display_evidence(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    machine_id: Optional[str] = Query(None),
    shift_id: Optional[str] = Query(None),
    worker_id: Optional[str] = Query(None),
    payload: dict = Depends(get_current_user_payload),
):
    """
    List HMI display evidence records with dual-head OCR details.
    """
    raw_list = evidence_storage.list_evidence(limit=200, offset=0)

    # Filter
    filtered = []
    for r in raw_list:
        if machine_id and r.get("machine_id") != machine_id:
            continue
        if shift_id and r.get("shift_id") != shift_id:
            continue
        if worker_id and r.get("worker_id") != worker_id:
            continue
        filtered.append(r)

    sliced = filtered[offset : offset + limit]

    results = []
    for r in sliced:
        ev_id = r.get("evidence_id")
        m_code = r.get("machine_id")
        m_matches = machines_store.query(lambda m: m.get("machine_code") == m_code or m.get("id") == m_code)
        machine = m_matches[0] if m_matches else None

        w_id = r.get("worker_id")
        worker = users_store.get_by_id(w_id) if w_id else None

        ocr_items = machine_ocr_stream.read_stream(filter_func=lambda o: o.get("evidence_id") == ev_id)
        ocr_items.sort(key=lambda o: o.get("head_number", 1))

        results.append(
            MachineDisplayEvidenceResponse(
                id=ev_id,
                evidence_uuid=r.get("evidence_uuid", ev_id),
                machine_id=machine.get("id") if machine else m_code,
                machine_code=machine.get("machine_code") if machine else m_code,
                machine_name=machine.get("name") if machine else m_code,
                qr_id=r.get("qr_id"),
                shift_id=r.get("shift_id"),
                worker_id=w_id or "unknown",
                worker_name=worker.get("full_name") if worker else "Worker",
                mime_type=r.get("mime_type", "image/jpeg"),
                file_size=r.get("file_size", 0),
                image_sha256=r.get("image_sha256", ""),
                captured_at=r.get("captured_at"),
                server_received_at=r.get("server_received_at"),
                upload_status=r.get("upload_status", "uploaded"),
                verification_status=r.get("verification_status", "verified"),
                image_url=f"/api/v1/machine-readings/evidence/{ev_id}/image",
                head_readings=[MachineReadingOCRResponse(**item) for item in ocr_items],
                created_at=r.get("server_received_at"),
            )
        )
    return results


@router.get("/evidence/{evidence_id}", response_model=MachineDisplayEvidenceResponse)
def get_machine_display_evidence(
    evidence_id: str,
    payload: dict = Depends(get_current_user_payload),
):
    """
    Fetch a single HMI display evidence record with complete dual-head readings.
    """
    r = evidence_storage.get_by_id(evidence_id)
    if not r:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    ev_id = r.get("evidence_id")
    m_code = r.get("machine_id")
    m_matches = machines_store.query(lambda m: m.get("machine_code") == m_code or m.get("id") == m_code)
    machine = m_matches[0] if m_matches else None

    w_id = r.get("worker_id")
    worker = users_store.get_by_id(w_id) if w_id else None

    ocr_items = machine_ocr_stream.read_stream(filter_func=lambda o: o.get("evidence_id") == ev_id)
    ocr_items.sort(key=lambda o: o.get("head_number", 1))

    return MachineDisplayEvidenceResponse(
        id=ev_id,
        evidence_uuid=r.get("evidence_uuid", ev_id),
        machine_id=machine.get("id") if machine else m_code,
        machine_code=machine.get("machine_code") if machine else m_code,
        machine_name=machine.get("name") if machine else m_code,
        qr_id=r.get("qr_id"),
        shift_id=r.get("shift_id"),
        worker_id=w_id or "unknown",
        worker_name=worker.get("full_name") if worker else "Worker",
        mime_type=r.get("mime_type", "image/jpeg"),
        file_size=r.get("file_size", 0),
        image_sha256=r.get("image_sha256", ""),
        captured_at=r.get("captured_at"),
        server_received_at=r.get("server_received_at"),
        upload_status=r.get("upload_status", "uploaded"),
        verification_status=r.get("verification_status", "verified"),
        image_url=f"/api/v1/machine-readings/evidence/{ev_id}/image",
        head_readings=[MachineReadingOCRResponse(**item) for item in ocr_items],
        created_at=r.get("server_received_at"),
    )


@router.get("/evidence/{evidence_id}/image")
def get_machine_display_evidence_image(
    evidence_id: str,
    token: Optional[str] = Query(None),
):
    """
    Stream full-resolution original captured HMI photograph from protected private storage.
    """
    r = evidence_storage.get_by_id(evidence_id)
    if not r:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    file_path = Path(r.get("absolute_path", ""))
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Physical evidence image file not found")

    return FileResponse(
        path=str(file_path),
        media_type=r.get("mime_type", "image/jpeg"),
        filename=r.get("original_filename", "evidence.jpg"),
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
            "X-Evidence-SHA256": r.get("image_sha256", ""),
        },
    )
