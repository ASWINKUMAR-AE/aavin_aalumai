from datetime import datetime, timezone, timedelta
from typing import Tuple
from sqlalchemy.orm import Session
from app.models.integrity import ServerTimeAnchor

def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

class TimeIntegrityService:
    @staticmethod
    def reconcile_capture_time(
        db: Session,
        device_id: str,
        boot_id: str,
        device_wall_time: datetime,
        device_monotonic_ms: int,
        server_receive_time: datetime
    ) -> Tuple[datetime, str, str]:
        """
        Reconciles capture time using server-anchored monotonic clocks.
        Returns: (estimated_capture_time, status, reason)
        status: 'verified', 'offset_flagged', 'unverified_reboot'
        """
        device_wall_time = ensure_utc(device_wall_time)
        server_receive_time = ensure_utc(server_receive_time)

        # 1. Check for valid server time anchor for this device and boot_id
        anchor = (
            db.query(ServerTimeAnchor)
            .filter(
                ServerTimeAnchor.device_id == device_id,
                ServerTimeAnchor.device_boot_identifier == boot_id
            )
            .order_by(ServerTimeAnchor.server_time.desc())
            .first()
        )

        if not anchor:
            # First sync or reboot since last anchor
            new_anchor = ServerTimeAnchor(
                device_id=device_id,
                device_boot_identifier=boot_id,
                monotonic_at_sync=device_monotonic_ms,
                server_time=server_receive_time
            )
            db.add(new_anchor)
            
            diff_seconds = abs((server_receive_time - device_wall_time).total_seconds())
            if diff_seconds > 600:
                return device_wall_time, "offset_flagged", f"Device time offset of {int(diff_seconds)}s exceeds 600s threshold"
            return device_wall_time, "verified", "Initial device anchor established"

        # 2. Monotonic elapsed difference
        anchor_server_time = ensure_utc(anchor.server_time)
        elapsed_ms = device_monotonic_ms - anchor.monotonic_at_sync
        estimated_time = anchor_server_time + timedelta(milliseconds=elapsed_ms)

        # 3. Check for anomalies
        wall_diff_seconds = abs((estimated_time - device_wall_time).total_seconds())
        if wall_diff_seconds > 300: # 5 minutes
            return estimated_time, "offset_flagged", f"Estimated time diverges from device clock by {int(wall_diff_seconds)}s"

        return estimated_time, "verified", "Time verified via monotonic anchor"
