from datetime import datetime, timezone
import hashlib
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.machine import Head, Machine, Variant, HeadThreshold
from app.models.reading import Reading, ReadingEvidence, ResetEvent
from app.services.hash_chain_service import HashChainService
from app.services.time_integrity_service import TimeIntegrityService, ensure_utc
from app.services.anomaly_service import AnomalyService

class ReadingService:
    @staticmethod
    def submit_reading(
        db: Session,
        machine_id: str,
        head_id: str,
        variant_id: str,
        user_id: str,
        count: int,
        ocr_value: Optional[int],
        confirmed_value: int,
        ocr_confidence: float,
        device_time: datetime,
        device_monotonic_ms: int,
        device_boot_id: str,
        source: str,
        photo_bytes: bytes,
        capture_device_id: Optional[str] = None,
        reset_event_id: Optional[str] = None,
        slot_id: Optional[str] = None
    ) -> Reading:
        # 1. Fetch Head & Machine
        head = db.query(Head).filter(Head.id == head_id).first()
        if not head:
            raise ValueError(f"Head '{head_id}' does not exist")
        
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            raise ValueError(f"Machine '{machine_id}' does not exist")

        variant = db.query(Variant).filter(Variant.id == variant_id).first()
        if not variant:
            raise ValueError(f"Variant '{variant_id}' does not exist")

        device_time = ensure_utc(device_time)
        server_now = ensure_utc(datetime.now(timezone.utc))
        
        # 2. Reconcile Time Integrity
        estimated_time, time_status, time_notes = TimeIntegrityService.reconcile_capture_time(
            db=db,
            device_id=capture_device_id or "unknown_device",
            boot_id=device_boot_id,
            device_wall_time=device_time,
            device_monotonic_ms=device_monotonic_ms,
            server_receive_time=server_now
        )
        estimated_time = ensure_utc(estimated_time)

        # 3. Fetch Previous Reading for Delta & Hash Chain Link
        prev_reading = (
            db.query(Reading)
            .filter(Reading.head_id == head_id)
            .order_by(Reading.created_at.desc(), Reading.count.desc())
            .first()
        )

        prev_hash = prev_reading.hash if prev_reading else head.genesis_hash
        prev_count = prev_reading.count if prev_reading else 0

        # 4. Production Delta & Validation Logic
        flags = {}
        production_delta = 0

        if prev_reading is None:
            # First reading after Genesis
            production_delta = 0
            flags["initial_reading"] = True
        else:
            if count >= prev_count:
                production_delta = count - prev_count
            else:
                # Counter decreased! Must verify approved reset event
                if reset_event_id:
                    reset_event = db.query(ResetEvent).filter(
                        ResetEvent.id == reset_event_id,
                        ResetEvent.head_id == head_id,
                        ResetEvent.approval_status == "approved"
                    ).first()
                    if reset_event:
                        # 1,000,000 rollover rule
                        production_delta = (1_000_000 - prev_count) + count
                        flags["witnessed_reset_applied"] = True
                    else:
                        flags["unapproved_reset_rejected"] = True
                        AnomalyService.create_anomaly(
                            db, "unwitnessed_reset", "Critical",
                            f"Counter dropped from {prev_count} to {count} with unapproved reset ID {reset_event_id}",
                            machine_id=machine_id, head_id=head_id
                        )
                else:
                    flags["negative_counter_delta"] = True
                    AnomalyService.create_anomaly(
                        db, "negative_delta", "Critical",
                        f"Unexplained counter decrease from {prev_count} to {count}",
                        machine_id=machine_id, head_id=head_id
                    )

        # 5. Check Production Rate against threshold
        threshold = db.query(HeadThreshold).filter(HeadThreshold.head_id == head_id).first()
        max_rate = threshold.max_rate_per_hour if threshold else 3000
        if prev_reading:
            prev_time = ensure_utc(prev_reading.estimated_capture_time)
            elapsed_seconds = max(1, (estimated_time - prev_time).total_seconds())
            hourly_rate = (production_delta / elapsed_seconds) * 3600
            if hourly_rate > max_rate:
                flags["excessive_production_rate"] = True
                AnomalyService.create_anomaly(
                    db, "excessive_rate", "High",
                    f"Calculated rate of {int(hourly_rate)} packets/hr exceeds threshold {max_rate}",
                    machine_id=machine_id, head_id=head_id
                )

        # 6. Check OCR Mismatch
        confirmation_mismatch = False
        if ocr_value is not None and ocr_value != confirmed_value:
            confirmation_mismatch = True
            flags["ocr_mismatch"] = True
            AnomalyService.create_anomaly(
                db, "ocr_mismatch", "Medium",
                f"Worker confirmed count {confirmed_value} differs from OCR extracted value {ocr_value}",
                machine_id=machine_id, head_id=head_id
            )

        # 7. Evidence SHA-256
        photo_sha256 = hashlib.sha256(photo_bytes).hexdigest()
        photo_key = f"evidence/{head_id}/{server_now.strftime('%Y%m%d_%H%M%S')}_{photo_sha256[:12]}.jpg"

        # 8. Cryptographic Hash Chain Calculation
        import uuid
        reading_id = str(uuid.uuid4())
        reading_hash = HashChainService.calculate_reading_hash(
            reading_id=reading_id,
            machine_id=machine_id,
            head_id=head_id,
            count=confirmed_value,
            device_time_iso=device_time.astimezone(timezone.utc).isoformat(),
            estimated_capture_time_iso=estimated_time.astimezone(timezone.utc).isoformat(),
            server_time_iso=server_now.astimezone(timezone.utc).isoformat(),
            variant_id=variant_id,
            user_id=user_id,
            source=source,
            evidence_sha256=photo_sha256,
            prev_hash=prev_hash,
            canonical_version="v1"
        )

        # 9. Create Reading Record
        reading = Reading(
            id=reading_id,
            machine_id=machine_id,
            head_id=head_id,
            variant_id=variant_id,
            user_id=user_id,
            slot_id=slot_id,
            count=confirmed_value,
            ocr_value=ocr_value,
            confirmed_value=confirmed_value,
            ocr_confidence=ocr_confidence,
            confirmation_mismatch=confirmation_mismatch,
            production_delta=production_delta,
            device_time=device_time,
            device_monotonic_time=device_monotonic_ms,
            device_boot_identifier=device_boot_id,
            server_time=server_now,
            estimated_capture_time=estimated_time,
            time_verification_status=time_status,
            source=source,
            capture_device_id=capture_device_id,
            photo_object_key=photo_key,
            photo_sha256=photo_sha256,
            prev_hash=prev_hash,
            hash=reading_hash,
            canonical_version="v1",
            reset_event_id=reset_event_id,
            flags=flags,
            created_at=server_now
        )
        db.add(reading)

        # 10. Create Evidence Record
        evidence = ReadingEvidence(
            reading_id=reading_id,
            raw_photo_key=photo_key,
            raw_photo_sha256=photo_sha256,
            mime_type="image/jpeg",
            file_size_bytes=len(photo_bytes),
            created_at=server_now
        )
        db.add(evidence)

        # 11. Update Head Current Hash
        head.current_hash = reading_hash
        
        db.commit()
        db.refresh(reading)
        return reading
