from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional, Any, Dict
from app.storage.json_storage import JsonStorage
from app.core.logging import logger
import os

DATA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
time_anchors_store = JsonStorage(os.path.join(DATA_ROOT, "config", "time_anchors.json"), id_field="device_id")

def ensure_utc(dt: Any) -> datetime:
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class TimeIntegrityService:
    @staticmethod
    def reconcile_capture_time(
        db: Optional[Any] = None,
        device_id: str = "unknown_device",
        boot_id: str = "unknown_boot",
        device_wall_time: Optional[datetime] = None,
        device_monotonic_ms: int = 0,
        server_receive_time: Optional[datetime] = None
    ) -> Tuple[datetime, str, str]:
        """
        Reconciles capture time using server-anchored monotonic clocks.
        Returns: (estimated_capture_time, status, reason)
        status: 'verified', 'offset_flagged', 'unverified_reboot'
        """
        device_wall_time = ensure_utc(device_wall_time or datetime.now(timezone.utc))
        server_receive_time = ensure_utc(server_receive_time or datetime.now(timezone.utc))

        # Check file store for anchor
        anchor = time_anchors_store.get_by_id(device_id)

        if not anchor or anchor.get("device_boot_identifier") != boot_id:
            # First sync or reboot since last anchor
            new_anchor = {
                "device_id": device_id,
                "device_boot_identifier": boot_id,
                "monotonic_at_sync": device_monotonic_ms,
                "server_time": server_receive_time.isoformat()
            }
            try:
                time_anchors_store.upsert(new_anchor)
            except Exception as e:
                logger.error(f"Failed to upsert time anchor: {e}")

            diff_seconds = abs((server_receive_time - device_wall_time).total_seconds())
            if diff_seconds > 600:
                return device_wall_time, "offset_flagged", f"Device time offset of {int(diff_seconds)}s exceeds 600s threshold"
            return device_wall_time, "verified", "Initial device anchor established"

        # Monotonic elapsed difference
        try:
            anchor_server_time = ensure_utc(anchor.get("server_time"))
            elapsed_ms = device_monotonic_ms - anchor.get("monotonic_at_sync", 0)
            estimated_time = anchor_server_time + timedelta(milliseconds=elapsed_ms)
        except Exception:
            estimated_time = device_wall_time

        # Check for anomalies
        wall_diff_seconds = abs((estimated_time - device_wall_time).total_seconds())
        if wall_diff_seconds > 300: # 5 minutes
            return estimated_time, "offset_flagged", f"Estimated time diverges from device clock by {int(wall_diff_seconds)}s"

        return estimated_time, "verified", "Time verified via monotonic anchor"
