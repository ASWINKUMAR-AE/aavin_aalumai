import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.storage.store import (
    machines_store,
    heads_store,
    variants_store,
    head_thresholds_store,
    readings_stream,
    audit_chain,
    anomalies_store,
    resets_store
)
from app.services.hash_chain_service import HashChainService
from app.services.time_integrity_service import TimeIntegrityService, ensure_utc
from app.services.anomaly_service import AnomalyService
from app.core.logging import logger


class ReadingService:
    @staticmethod
    def submit_reading(
        db: Optional[Any] = None,
        machine_id: str = "",
        head_id: str = "",
        variant_id: str = "",
        user_id: str = "",
        count: int = 0,
        ocr_value: Optional[int] = None,
        confirmed_value: int = 0,
        ocr_confidence: float = 1.0,
        device_time: Optional[datetime] = None,
        device_monotonic_ms: int = 0,
        device_boot_id: str = "unknown_boot",
        source: str = "photo_ocr",
        photo_bytes: bytes = b"",
        capture_device_id: Optional[str] = None,
        reset_event_id: Optional[str] = None,
        slot_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Database-free reading submission.
        Validates head/machine/variant, reconciles time integrity, enforces monotonic
        counter checks, calculates SHA-256 hash chain link, and appends to append-only streams.
        """
        # 1. Resolve Head
        head = heads_store.get_by_id(head_id)
        if not head:
            matches = heads_store.query(lambda h: h.get("head_code") == head_id)
            head = matches[0] if matches else None
        if not head:
            raise ValueError(f"Head '{head_id}' does not exist in registry")

        # 2. Resolve Machine
        machine = machines_store.get_by_id(machine_id)
        if not machine:
            matches = machines_store.query(lambda m: m.get("machine_code") == machine_id)
            machine = matches[0] if matches else None
        if not machine:
            raise ValueError(f"Machine '{machine_id}' does not exist in registry")

        # 3. Resolve Variant
        variant = variants_store.get_by_id(variant_id)
        if not variant:
            matches = variants_store.query(lambda v: v.get("code") == variant_id)
            variant = matches[0] if matches else None
        if not variant:
            all_v = variants_store.read_all()
            variant = all_v[0] if all_v else {"id": variant_id, "code": "TM-500"}

        device_time = ensure_utc(device_time or datetime.now(timezone.utc))
        server_now = ensure_utc(datetime.now(timezone.utc))

        # 4. Reconcile Time Integrity
        estimated_time, time_status, time_notes = TimeIntegrityService.reconcile_capture_time(
            db=db,
            device_id=capture_device_id or "unknown_device",
            boot_id=device_boot_id,
            device_wall_time=device_time,
            device_monotonic_ms=device_monotonic_ms,
            server_receive_time=server_now
        )
        estimated_time = ensure_utc(estimated_time)

        # 5. Fetch Previous Reading for Delta & Hash Chain Link from readings_stream
        head_primary_id = head.get("id")
        head_code = head.get("head_code")
        prev_readings = readings_stream.read_stream(
            filter_func=lambda r: r.get("head_id") == head_primary_id or r.get("head_code") == head_code,
            reverse=True,
            limit=1
        )
        prev_reading = prev_readings[0] if prev_readings else None

        prev_hash = prev_reading.get("hash") if prev_reading else head.get("genesis_hash", "")
        prev_count = prev_reading.get("count", 0) if prev_reading else 0

        # 6. Production Delta & Validation Logic
        flags: Dict[str, Any] = {}
        production_delta = 0

        if prev_reading is None:
            # First reading after Genesis
            production_delta = 0
            flags["initial_reading"] = True
        else:
            if confirmed_value >= prev_count:
                production_delta = confirmed_value - prev_count
            else:
                # Counter decreased! Verify reset event
                if reset_event_id:
                    reset_rec = resets_store.get_by_id(reset_event_id)
                    if reset_rec and reset_rec.get("approval_status") == "approved":
                        production_delta = (1_000_000 - prev_count) + confirmed_value
                        flags["witnessed_reset_applied"] = True
                    else:
                        flags["unapproved_reset_rejected"] = True
                        AnomalyService.create_anomaly(
                            anomaly_type="unwitnessed_reset",
                            severity="Critical",
                            description=f"Counter dropped from {prev_count} to {confirmed_value} with unapproved reset ID {reset_event_id}",
                            machine_id=machine.get("id"),
                            head_id=head.get("id")
                        )
                else:
                    flags["negative_counter_delta"] = True
                    AnomalyService.create_anomaly(
                        anomaly_type="negative_delta",
                        severity="Critical",
                        description=f"Unexplained counter decrease from {prev_count} to {confirmed_value}",
                        machine_id=machine.get("id"),
                        head_id=head.get("id")
                    )

        # 7. Check Production Rate against threshold
        threshold_matches = head_thresholds_store.query(lambda t: t.get("head_id") == head.get("id"))
        max_rate = threshold_matches[0].get("max_rate_per_hour", 3000) if threshold_matches else 3000

        if prev_reading:
            try:
                prev_time = ensure_utc(prev_reading.get("estimated_capture_time"))
                elapsed_seconds = max(1.0, (estimated_time - prev_time).total_seconds())
                hourly_rate = (production_delta / elapsed_seconds) * 3600.0
                if hourly_rate > max_rate:
                    flags["excessive_production_rate"] = True
                    AnomalyService.create_anomaly(
                        anomaly_type="excessive_rate",
                        severity="High",
                        description=f"Calculated rate of {int(hourly_rate)} packets/hr exceeds threshold {max_rate}",
                        machine_id=machine.get("id"),
                        head_id=head.get("id")
                    )
            except Exception as e:
                logger.warning(f"Failed to calculate production rate: {e}")

        # 8. Check OCR Mismatch
        confirmation_mismatch = False
        if ocr_value is not None and ocr_value != confirmed_value:
            confirmation_mismatch = True
            flags["ocr_mismatch"] = True
            AnomalyService.create_anomaly(
                anomaly_type="ocr_mismatch",
                severity="Medium",
                description=f"Worker confirmed count {confirmed_value} differs from OCR extracted value {ocr_value}",
                machine_id=machine.get("id"),
                head_id=head.get("id")
            )

        # 9. Evidence SHA-256
        photo_sha256 = hashlib.sha256(photo_bytes).hexdigest() if photo_bytes else "no_photo_bytes"
        photo_key = f"evidence/{head.get('id')}/{server_now.strftime('%Y%m%d_%H%M%S')}_{photo_sha256[:12]}.jpg"

        # 10. Cryptographic Hash Chain Calculation
        reading_id = str(uuid.uuid4())
        reading_hash = HashChainService.calculate_reading_hash(
            reading_id=reading_id,
            machine_id=str(machine.get("id")),
            head_id=str(head.get("id")),
            count=confirmed_value,
            device_time_iso=device_time.isoformat(),
            estimated_capture_time_iso=estimated_time.isoformat(),
            server_time_iso=server_now.isoformat(),
            variant_id=str(variant.get("id")),
            user_id=str(user_id),
            source=source,
            evidence_sha256=photo_sha256,
            prev_hash=prev_hash,
            canonical_version="v1"
        )

        reading_doc = {
            "id": reading_id,
            "reading_id": reading_id,
            "machine_id": machine.get("id"),
            "machine_code": machine.get("machine_code"),
            "head_id": head.get("id"),
            "head_code": head.get("head_code"),
            "variant_id": variant.get("id"),
            "variant_code": variant.get("code"),
            "user_id": user_id,
            "slot_id": slot_id,
            "count": confirmed_value,
            "ocr_value": ocr_value,
            "confirmed_value": confirmed_value,
            "ocr_confidence": ocr_confidence,
            "confirmation_mismatch": confirmation_mismatch,
            "production_delta": production_delta,
            "device_time": device_time.isoformat(),
            "device_monotonic_time": device_monotonic_ms,
            "device_boot_identifier": device_boot_id,
            "server_time": server_now.isoformat(),
            "estimated_capture_time": estimated_time.isoformat(),
            "time_verification_status": time_status,
            "source": source,
            "capture_device_id": capture_device_id,
            "photo_object_key": photo_key,
            "photo_sha256": photo_sha256,
            "prev_hash": prev_hash,
            "hash": reading_hash,
            "canonical_version": "v1",
            "reset_event_id": reset_event_id,
            "flags": flags,
            "created_at": server_now.isoformat()
        }

        # 11. Append to append-only stream
        readings_stream.append_event(reading_doc)

        # 12. Record Audit Event
        audit_event = {
            "event_type": "READING_SUBMITTED",
            "reading_id": reading_id,
            "machine_id": machine.get("id"),
            "head_id": head.get("id"),
            "confirmed_value": confirmed_value,
            "delta": production_delta,
            "user_id": user_id,
            "server_time": server_now.isoformat(),
            "reading_hash": reading_hash,
            "prev_hash": prev_hash
        }
        audit_chain.append_event(audit_event)

        # 13. Update Head current hash & counter in head store
        heads_store.update(head.get("id"), {
            "current_hash": reading_hash,
            "latest_counter": confirmed_value,
            "latest_reading_time": server_now.isoformat()
        })

        # 14. If ORM db session was passed, persist for ORM callers
        if db is not None:
            try:
                from app.models.reading import Reading, ReadingEvidence
                orm_reading = Reading(
                    id=reading_id,
                    machine_id=machine.get("id"),
                    head_id=head.get("id"),
                    variant_id=variant.get("id"),
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
                db.add(orm_reading)
                db.flush()
            except Exception as e:
                logger.debug(f"Optional ORM reading sync bypassed: {e}")

        logger.info(f"Reading {reading_id} successfully recorded for Head {head.get('head_code')}: Count {confirmed_value} (Delta +{production_delta})")
        return reading_doc
