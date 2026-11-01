import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
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
    def verify_head_chain(
        db: Optional[Any] = None,
        head_id: str = "",
        genesis_hash: Optional[str] = None,
        readings_list: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[bool, int, List[Dict[str, Any]]]:
        """
        Step-by-step verification of an entire head's hash chain from Genesis to current reading.
        Supports both database-free storage and legacy ORM queries.
        Returns: (is_valid, total_checked, discrepancies)
        """
        expected_prev_hash = genesis_hash
        readings = readings_list

        if readings is None and db is not None:
            head = db.query(Head).filter(Head.id == head_id).first()
            if not head:
                return False, 0, [{"error": f"Head {head_id} not found"}]
            expected_prev_hash = head.genesis_hash
            orm_readings = (
                db.query(Reading)
                .filter(Reading.head_id == head_id)
                .order_by(Reading.created_at.asc(), Reading.count.asc())
                .all()
            )
            readings = [
                {
                    "id": r.id,
                    "machine_id": r.machine_id,
                    "head_id": r.head_id,
                    "count": r.count,
                    "device_time": r.device_time.isoformat() if hasattr(r.device_time, "isoformat") else str(r.device_time),
                    "estimated_capture_time": r.estimated_capture_time.isoformat() if hasattr(r.estimated_capture_time, "isoformat") else str(r.estimated_capture_time),
                    "server_time": r.server_time.isoformat() if hasattr(r.server_time, "isoformat") else str(r.server_time),
                    "variant_id": r.variant_id,
                    "user_id": r.user_id,
                    "source": r.source,
                    "photo_sha256": r.photo_sha256,
                    "prev_hash": r.prev_hash,
                    "hash": r.hash,
                    "canonical_version": r.canonical_version or "v1",
                }
                for r in orm_readings
            ]

        if readings is None:
            from app.storage.store import heads_store, readings_stream
            head_rec = heads_store.get_by_id(head_id)
            if not head_rec:
                matches = heads_store.query(lambda h: h.get("head_code") == head_id)
                head_rec = matches[0] if matches else None
            if not head_rec:
                return False, 0, [{"error": f"Head {head_id} not found"}]
            expected_prev_hash = head_rec.get("genesis_hash")
            readings = readings_stream.read_stream(
                filter_func=lambda r: r.get("head_id") == head_id or r.get("head_code") == head_id
            )
            # sort by created_at / count
            readings.sort(key=lambda r: (r.get("created_at", ""), r.get("count", 0)))

        discrepancies = []
        checked_count = 0

        for r in readings:
            checked_count += 1
            r_prev_hash = r.get("prev_hash")
            r_hash = r.get("hash")
            r_id = r.get("id") or r.get("reading_id")
            r_count = r.get("count", 0)

            # 1. Verify link continuity
            if r_prev_hash != expected_prev_hash:
                discrepancies.append({
                    "reading_id": r_id,
                    "count": r_count,
                    "error": "CHAIN_BROKEN_LINK",
                    "expected_prev": expected_prev_hash,
                    "actual_prev": r_prev_hash
                })

            # 2. Recompute expected hash
            dev_time_str = str(r.get("device_time", ""))
            est_time_str = str(r.get("estimated_capture_time", ""))
            srv_time_str = str(r.get("server_time", ""))
            photo_sha256 = r.get("photo_sha256") or r.get("evidence_sha256", "")

            recomputed = HashChainService.calculate_reading_hash(
                reading_id=str(r_id),
                machine_id=str(r.get("machine_id", "")),
                head_id=str(r.get("head_id", "")),
                count=int(r_count),
                device_time_iso=dev_time_str,
                estimated_capture_time_iso=est_time_str,
                server_time_iso=srv_time_str,
                variant_id=str(r.get("variant_id", "")),
                user_id=str(r.get("user_id", "")),
                source=str(r.get("source", "")),
                evidence_sha256=photo_sha256,
                prev_hash=r_prev_hash,
                canonical_version=r.get("canonical_version", "v1")
            )

            if recomputed != r_hash:
                discrepancies.append({
                    "reading_id": r_id,
                    "count": r_count,
                    "error": "HASH_TAMPERED",
                    "recorded_hash": r_hash,
                    "recomputed_hash": recomputed
                })

            expected_prev_hash = r_hash

        is_valid = len(discrepancies) == 0
        return is_valid, checked_count, discrepancies
