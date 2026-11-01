import uuid
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from app.storage.store import anomalies_store
from app.core.logging import logger

class AnomalyService:
    @staticmethod
    def create_anomaly(
        db: Optional[Any] = None,
        anomaly_type: str = "general",
        severity: str = "Medium",
        description: str = "",
        machine_id: Optional[str] = None,
        head_id: Optional[str] = None,
        reading_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates an immutable anomaly record in file storage and (if db is provided) ORM session.
        """
        now = datetime.now(timezone.utc)
        anomaly_id = f"ANOM-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        anomaly_doc = {
            "id": anomaly_id,
            "machine_id": machine_id,
            "head_id": head_id,
            "reading_id": reading_id,
            "anomaly_type": anomaly_type,
            "severity": severity,
            "description": description,
            "detection_time": now.isoformat(),
            "status": "active"
        }

        try:
            anomalies_store.insert(anomaly_doc)
            logger.warning(f"Recorded anomaly [{severity}] {anomaly_type}: {description}")
        except Exception as e:
            logger.error(f"Failed to record anomaly to file store: {e}")

        # If legacy ORM session was passed, attempt to populate ORM object as well
        if db is not None:
            try:
                from app.models.integrity import Anomaly
                orm_anomaly = Anomaly(
                    id=anomaly_id,
                    machine_id=machine_id,
                    head_id=head_id,
                    reading_id=reading_id,
                    anomaly_type=anomaly_type,
                    severity=severity,
                    description=description,
                    detection_time=now,
                    status="active"
                )
                db.add(orm_anomaly)
                db.flush()
            except Exception:
                pass

        return anomaly_doc
