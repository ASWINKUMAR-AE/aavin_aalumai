from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.integrity import Anomaly, NotificationRecipient, NotificationDelivery

class AnomalyService:
    @staticmethod
    def create_anomaly(
        db: Session,
        anomaly_type: str,
        severity: str,
        description: str,
        machine_id: Optional[str] = None,
        head_id: Optional[str] = None,
        reading_id: Optional[str] = None
    ) -> Anomaly:
        anomaly = Anomaly(
            machine_id=machine_id,
            head_id=head_id,
            reading_id=reading_id,
            anomaly_type=anomaly_type,
            severity=severity,
            description=description,
            detection_time=datetime.now(timezone.utc),
            status="active"
        )
        db.add(anomaly)
        db.flush()
        
        # Check if email notifications should be dispatched
        if severity in ["Critical", "High"]:
            recipients = db.query(NotificationRecipient).filter(
                NotificationRecipient.is_active == True
            ).all()
            for r in recipients:
                delivery = NotificationDelivery(
                    recipient_email=r.email,
                    alert_type=anomaly_type,
                    subject=f"[{severity.upper()}] Aavin Production Alert: {anomaly_type}",
                    status="queued"
                )
                db.add(delivery)
                
        return anomaly
