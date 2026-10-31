from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import get_current_user_payload, require_permission
from app.models.integrity import Anomaly
from app.schemas.schemas import AnomalyResponse, AnomalyReviewRequest

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("", response_model=List[AnomalyResponse])
def list_anomalies(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    payload: dict = Depends(get_current_user_payload)
):
    query = db.query(Anomaly)
    if severity:
        query = query.filter(Anomaly.severity == severity)
    if status:
        query = query.filter(Anomaly.status == status)
    return query.order_by(Anomaly.detection_time.desc()).limit(limit).all()

@router.get("/{anomaly_id}", response_model=AnomalyResponse)
def get_anomaly(anomaly_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return anomaly

@router.post("/{anomaly_id}/review", response_model=AnomalyResponse)
def review_anomaly(
    anomaly_id: str,
    req: AnomalyReviewRequest,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("anomaly.review"))
):
    reviewer_id = payload.get("sub")
    anomaly = db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    anomaly.status = req.status
    anomaly.resolution_notes = req.resolution_notes
    anomaly.reviewer_id = reviewer_id
    anomaly.resolved_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(anomaly)
    return anomaly
