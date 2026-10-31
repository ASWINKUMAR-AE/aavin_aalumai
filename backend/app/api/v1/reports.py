import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import require_permission
from app.models.reading import Reading
from app.models.integrity import Anomaly

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/production.csv")
def export_production_csv(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("report.export"))
):
    readings = db.query(Reading).order_by(Reading.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Reading ID", "Machine ID", "Head ID", "Count", "OCR Value", 
        "Confirmed Value", "Production Delta", "Device Time UTC", "Server Time UTC",
        "Verification Status", "Reading Hash", "Previous Hash"
    ])
    
    for r in readings:
        writer.writerow([
            r.id, r.machine_id, r.head_id, r.count, r.ocr_value,
            r.confirmed_value, r.production_delta,
            r.device_time.isoformat() if r.device_time else "",
            r.server_time.isoformat() if r.server_time else "",
            r.time_verification_status, r.hash, r.prev_hash
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=aavin_production_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return response

@router.get("/anomalies.csv")
def export_anomalies_csv(
    db: Session = Depends(get_db),
    payload: dict = Depends(require_permission("report.export"))
):
    anomalies = db.query(Anomaly).order_by(Anomaly.detection_time.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Anomaly ID", "Type", "Severity", "Machine ID", "Head ID",
        "Detected Time UTC", "Status", "Description", "Resolution Notes"
    ])
    
    for a in anomalies:
        writer.writerow([
            a.id, a.anomaly_type, a.severity, a.machine_id, a.head_id,
            a.detection_time.isoformat() if a.detection_time else "",
            a.status, a.description, a.resolution_notes or ""
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=aavin_anomalies_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return response
