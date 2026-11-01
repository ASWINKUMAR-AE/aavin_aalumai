from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.permissions import get_current_user_payload, require_permission
from app.storage.store import anomalies_store
from app.schemas.schemas import AnomalyResponse, AnomalyReviewRequest

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("", response_model=List[AnomalyResponse])
def list_anomalies(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    payload: dict = Depends(get_current_user_payload)
):
    all_anomalies = anomalies_store.read_all()
    filtered = []
    for a in all_anomalies:
        if severity and a.get("severity") != severity:
            continue
        if status and a.get("status") != status:
            continue
        filtered.append(a)

    filtered.sort(key=lambda a: a.get("detection_time", ""), reverse=True)
    return [AnomalyResponse(**a) for a in filtered[:limit]]

@router.get("/{anomaly_id}", response_model=AnomalyResponse)
def get_anomaly(anomaly_id: str, payload: dict = Depends(get_current_user_payload)):
    anomaly = anomalies_store.get_by_id(anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return AnomalyResponse(**anomaly)

@router.post("/{anomaly_id}/review", response_model=AnomalyResponse)
def review_anomaly(
    anomaly_id: str,
    req: AnomalyReviewRequest,
    payload: dict = Depends(require_permission("anomaly.review"))
):
    reviewer_id = payload.get("sub")
    anomaly = anomalies_store.get_by_id(anomaly_id)
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")

    updated = anomalies_store.update(anomaly_id, {
        "status": req.status,
        "resolution_notes": req.resolution_notes,
        "reviewer_id": reviewer_id,
        "resolved_at": datetime.now(timezone.utc).isoformat()
    })
    return AnomalyResponse(**updated)
