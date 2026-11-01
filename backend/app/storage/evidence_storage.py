import os
import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from app.storage.file_lock import FileLock
from app.storage.json_storage import JsonStreamStorage
from app.core.logging import logger


class EvidenceStorage:
    """
    Dedicated private filesystem storage for HMI evidence photographs.
    Ensures cryptographic integrity verification (SHA-256) upon write and read.
    Maintains an append-only evidence manifest stream.
    """
    def __init__(self, base_dir: str = "backend/data/evidence"):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = self.base_dir / "evidence_manifest.jsonl"
        self.manifest_stream = JsonStreamStorage(str(self.manifest_path))

    def save_evidence(
        self,
        image_bytes: bytes,
        original_filename: str,
        mime_type: str,
        machine_id: str,
        qr_id: Optional[str] = None,
        shift_id: Optional[str] = None,
        worker_id: Optional[str] = None,
        captured_at: Optional[datetime] = None,
        device_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Atomically saves evidence photograph to disk with SHA-256 verification and records manifest entry.
        """
        now = datetime.now(timezone.utc)
        file_size = len(image_bytes)
        sha256_hash = hashlib.sha256(image_bytes).hexdigest()

        # Check if identical hash already exists in manifest
        existing_manifest = self.get_by_sha256(sha256_hash)
        is_duplicate = existing_manifest is not None

        # Build path structured by year/month
        year_month_dir = self.base_dir / f"{now.year}" / f"{now.month:02d}"
        year_month_dir.mkdir(parents=True, exist_ok=True)

        evidence_uuid = str(uuid.uuid4())
        ext = "jpg" if "jpeg" in mime_type.lower() or "jpg" in mime_type.lower() else "png"
        stored_filename = f"{evidence_uuid}.{ext}"
        stored_path = year_month_dir / stored_filename

        # Write file atomically with FileLock
        with FileLock(str(stored_path)):
            with open(stored_path, "wb") as f:
                f.write(image_bytes)
                f.flush()
                os.fsync(f.fileno())

        # Verify written file integrity
        with open(stored_path, "rb") as f:
            written_bytes = f.read()
            written_hash = hashlib.sha256(written_bytes).hexdigest()
            if written_hash != sha256_hash:
                try:
                    os.remove(stored_path)
                except OSError:
                    pass
                raise IOError("Cryptographic verification failed after writing image to disk.")

        manifest_entry = {
            "id": evidence_uuid,
            "evidence_id": evidence_uuid,
            "evidence_uuid": evidence_uuid,
            "machine_id": machine_id,
            "qr_id": qr_id,
            "shift_id": shift_id,
            "worker_id": worker_id,
            "device_id": device_id,
            "original_filename": original_filename,
            "mime_type": mime_type,
            "file_size": file_size,
            "image_sha256": sha256_hash,
            "relative_path": str(stored_path.relative_to(self.base_dir).as_posix()),
            "absolute_path": str(stored_path.as_posix()),
            "captured_at": captured_at.isoformat() if captured_at else now.isoformat(),
            "server_received_at": now.isoformat(),
            "upload_status": "uploaded",
            "verification_status": "duplicate_flagged" if is_duplicate else "verified",
            "is_duplicate": is_duplicate,
            "duplicate_of_id": existing_manifest["id"] if is_duplicate else None,
        }

        self.manifest_stream.append_event(manifest_entry)
        logger.info(f"Evidence stored successfully: {evidence_uuid} (SHA-256: {sha256_hash[:12]}...)")
        return manifest_entry

    def get_by_id(self, evidence_id: str) -> Optional[Dict[str, Any]]:
        entries = self.manifest_stream.read_stream(
            filter_func=lambda e: e.get("id") == evidence_id or e.get("evidence_id") == evidence_id
        )
        return entries[0] if entries else None

    def get_by_sha256(self, sha256_hash: str) -> Optional[Dict[str, Any]]:
        entries = self.manifest_stream.read_stream(
            filter_func=lambda e: e.get("image_sha256") == sha256_hash
        )
        return entries[0] if entries else None

    def verify_file_integrity(self, evidence_id: str) -> Tuple[bool, str]:
        entry = self.get_by_id(evidence_id)
        if not entry:
            return False, "Evidence entry not found in manifest"

        filepath = entry.get("absolute_path")
        if not filepath or not os.path.exists(filepath):
            return False, f"Evidence file not found on disk: {filepath}"

        with open(filepath, "rb") as f:
            actual_hash = hashlib.sha256(f.read()).hexdigest()

        expected_hash = entry.get("image_sha256")
        if actual_hash != expected_hash:
            return False, f"Hash mismatch: expected {expected_hash}, calculated {actual_hash}"

        return True, "Integrity verified successfully"

    def list_evidence(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        return self.manifest_stream.read_stream(limit=limit, offset=offset, reverse=True)

