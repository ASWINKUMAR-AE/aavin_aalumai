import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.models.machine import Head
from app.models.reading import Reading

def canonical_json(data: Dict[str, Any]) -> str:
    """
    Deterministically serializes dictionary into canonical JSON:
    - Keys sorted alphabetically
    - No whitespace around separators
    - Stable representation of integers, floats, booleans, and null
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class HashChainService:
    @staticmethod
    def create_genesis_hash(head_code: str, qr_identifier: str, created_at: datetime) -> str:
        """
        Creates a deterministic Genesis Block hash for a new machine head.
        """
        genesis_payload = {
            "type": "GENESIS_HEAD",
            "head_code": head_code,
            "qr_identifier": qr_identifier,
            "created_at": created_at.astimezone(timezone.utc).isoformat(),
            "version": "v1"
        }
        serialized = canonical_json(genesis_payload)
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

    @staticmethod
    def calculate_reading_hash(
        reading_id: str,
        machine_id: str,
        head_id: str,
        count: int,
        device_time_iso: str,
        estimated_capture_time_iso: str,
        server_time_iso: str,
        variant_id: str,
        user_id: str,
        source: str,
        evidence_sha256: str,
        prev_hash: str,
        canonical_version: str = "v1"
    ) -> str:
        """
        Calculates SHA-256 hash for a reading following canonical schema:
        SHA256( canonical_json(fields) + evidence_sha256 + server_time + prev_hash )
        """
        core_fields = {
            "canonical_version": canonical_version,
            "count": int(count),
            "device_time": device_time_iso,
            "estimated_capture_time": estimated_capture_time_iso,
            "head_id": str(head_id),
            "machine_id": str(machine_id),
            "reading_id": str(reading_id),
            "source": str(source),
            "user_id": str(user_id),
            "variant_id": str(variant_id)
        }
        canonical_body = canonical_json(core_fields)
        
        combined_payload = (
            f"{canonical_body}"
            f"::{evidence_sha256}"
            f"::{server_time_iso}"
            f"::{prev_hash}"
        )
        return hashlib.sha256(combined_payload.encode('utf-8')).hexdigest()

    @staticmethod
    def verify_head_chain(db: Session, head_id: str) -> Tuple[bool, int, List[Dict[str, Any]]]:
        """
        Step-by-step verification of an entire head's hash chain from Genesis to current reading.
        Returns: (is_valid, total_checked, discrepancies)
        """
        head = db.query(Head).filter(Head.id == head_id).first()
        if not head:
            return False, 0, [{"error": f"Head {head_id} not found"}]

        readings = (
            db.query(Reading)
            .filter(Reading.head_id == head_id)
            .order_by(Reading.created_at.asc(), Reading.count.asc())
            .all()
        )

        expected_prev_hash = head.genesis_hash
        discrepancies = []
        checked_count = 0

        for r in readings:
            checked_count += 1
            # 1. Verify link continuity
            if r.prev_hash != expected_prev_hash:
                discrepancies.append({
                    "reading_id": r.id,
                    "count": r.count,
                    "error": "CHAIN_BROKEN_LINK",
                    "expected_prev": expected_prev_hash,
                    "actual_prev": r.prev_hash
                })

            # 2. Recompute expected hash
            recomputed = HashChainService.calculate_reading_hash(
                reading_id=r.id,
                machine_id=r.machine_id,
                head_id=r.head_id,
                count=r.count,
                device_time_iso=ensure_utc(r.device_time).isoformat(),
                estimated_capture_time_iso=ensure_utc(r.estimated_capture_time).isoformat(),
                server_time_iso=ensure_utc(r.server_time).isoformat(),
                variant_id=r.variant_id,
                user_id=r.user_id,
                source=r.source,
                evidence_sha256=r.photo_sha256,
                prev_hash=r.prev_hash,
                canonical_version=r.canonical_version or "v1"
            )

            if recomputed != r.hash:
                discrepancies.append({
                    "reading_id": r.id,
                    "count": r.count,
                    "error": "HASH_TAMPERED",
                    "recorded_hash": r.hash,
                    "recomputed_hash": recomputed
                })

            expected_prev_hash = r.hash

        is_valid = len(discrepancies) == 0
        return is_valid, checked_count, discrepancies
