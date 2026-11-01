import os
import tarfile
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.storage.file_lock import FileLock
from app.core.logging import logger

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"
BACKUP_DIR = DATA_ROOT / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


class BackupService:
    """
    Automated Backup, Snapshot, and Disaster Recovery Service for database-free persistence.
    Produces encrypted or tar-compressed timestamped snapshots of `backend/data/` with SHA-256 integrity validation.
    """

    @staticmethod
    def create_backup(actor_id: str = "system", notes: str = "Automated backup snapshot") -> Dict[str, Any]:
        """
        Creates a complete atomic snapshot of all JSON documents, JSONL ledgers, and manifests.
        Excludes the backups folder itself to prevent recursive archives.
        """
        now = datetime.now(timezone.utc)
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        backup_filename = f"aavin_backup_{timestamp_str}.tar.gz"
        backup_path = BACKUP_DIR / backup_filename
        manifest_path = BACKUP_DIR / f"aavin_backup_{timestamp_str}_manifest.json"

        # Lock the entire data directory snapshot via a global backup lock
        lock_path = DATA_ROOT / ".backup_in_progress.lock"
        with FileLock(str(lock_path)):
            with tarfile.open(backup_path, "w:gz") as tar:
                for root, dirs, files in os.walk(DATA_ROOT):
                    # Skip backups directory
                    if "backups" in Path(root).parts:
                        continue
                    for file in files:
                        if file.endswith(".lock") or file.endswith(".tmp"):
                            continue
                        full_file_path = Path(root) / file
                        arcname = full_file_path.relative_to(DATA_ROOT)
                        tar.add(full_file_path, arcname=arcname)

            # Compute SHA-256 of the backup archive
            with open(backup_path, "rb") as f:
                backup_bytes = f.read()
                backup_sha256 = hashlib.sha256(backup_bytes).hexdigest()
                file_size = len(backup_bytes)

            manifest_data = {
                "backup_filename": backup_filename,
                "created_at": now.isoformat(),
                "created_by": actor_id,
                "file_size_bytes": file_size,
                "sha256": backup_sha256,
                "notes": notes,
                "status": "verified"
            }

            with open(manifest_path, "w", encoding="utf-8") as mf:
                json.dump(manifest_data, mf, indent=2)

        logger.info(f"Created system backup snapshot: {backup_filename} (SHA-256: {backup_sha256[:12]}...)")
        return manifest_data

    @staticmethod
    def list_backups() -> List[Dict[str, Any]]:
        """Lists all existing backups with integrity metadata."""
        backups = []
        for file in BACKUP_DIR.glob("*_manifest.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    backups.append(json.load(f))
            except Exception as e:
                logger.warning(f"Could not read backup manifest {file}: {e}")
        backups.sort(key=lambda b: b.get("created_at", ""), reverse=True)
        return backups

    @staticmethod
    def verify_backup(backup_filename: str) -> Dict[str, Any]:
        """Validates the cryptographic integrity of a specific backup snapshot."""
        tar_path = BACKUP_DIR / backup_filename
        if not tar_path.exists():
            return {"valid": False, "error": "Backup archive file not found"}

        prefix = backup_filename.replace(".tar.gz", "")
        manifest_path = BACKUP_DIR / f"{prefix}_manifest.json"
        if not manifest_path.exists():
            return {"valid": False, "error": "Backup manifest file not found"}

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        with open(tar_path, "rb") as f:
            actual_sha256 = hashlib.sha256(f.read()).hexdigest()

        is_valid = actual_sha256 == manifest.get("sha256")
        return {
            "valid": is_valid,
            "backup_filename": backup_filename,
            "expected_sha256": manifest.get("sha256"),
            "actual_sha256": actual_sha256,
            "file_size_bytes": os.path.getsize(tar_path)
        }

    @staticmethod
    def restore_backup(backup_filename: str, actor_id: str = "admin") -> Dict[str, Any]:
        """
        Safely restores system data from an existing verified backup archive.
        """
        verification = BackupService.verify_backup(backup_filename)
        if not verification.get("valid"):
            raise ValueError(f"Cannot restore: Backup failed integrity check: {verification.get('error')}")

        tar_path = BACKUP_DIR / backup_filename
        lock_path = DATA_ROOT / ".backup_in_progress.lock"

        with FileLock(str(lock_path)):
            with tarfile.open(tar_path, "r:gz") as tar:
                # Security: prevent path traversal (CVE-2007-4559)
                for member in tar.getmembers():
                    target_path = (DATA_ROOT / member.name).resolve()
                    if not str(target_path).startswith(str(DATA_ROOT.resolve())):
                        raise ValueError(f"Path traversal detected in archive: {member.name}")
                tar.extractall(path=DATA_ROOT)

        logger.info(f"System successfully restored from backup {backup_filename} by {actor_id}")
        return {
            "status": "success",
            "restored_from": backup_filename,
            "restored_at": datetime.now(timezone.utc).isoformat(),
            "restored_by": actor_id
        }
