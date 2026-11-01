import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response

from app.core.permissions import require_permission
from app.storage.store import readings_stream, anomalies_store, audit_chain

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/production.csv")
@router.get("/shift-production.csv")
def export_production_csv(
    payload: dict = Depends(require_permission("report.export"))
):
    readings = readings_stream.read_stream(reverse=True)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Reading ID", "Machine ID", "Head ID", "Count", "OCR Value", 
        "Confirmed Value", "Production Delta", "Device Time UTC", "Server Time UTC",
        "Verification Status", "Reading Hash", "Previous Hash", "Photo SHA256"
    ])
    
    for r in readings:
        writer.writerow([
            r.get("id"), r.get("machine_id"), r.get("head_id"), r.get("count"), r.get("ocr_value"),
            r.get("confirmed_value"), r.get("production_delta"),
            r.get("device_time", ""),
            r.get("server_time", ""),
            r.get("time_verification_status", "verified"),
            r.get("hash", ""),
            r.get("prev_hash", ""),
            r.get("photo_sha256", "")
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=aavin_production_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return response

@router.get("/anomalies.csv")
def export_anomalies_csv(
    payload: dict = Depends(require_permission("report.export"))
):
    anomalies = anomalies_store.read_all()
    anomalies.sort(key=lambda a: a.get("detection_time", ""), reverse=True)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Anomaly ID", "Type", "Severity", "Machine ID", "Head ID",
        "Detected Time UTC", "Status", "Description", "Resolution Notes"
    ])
    
    for a in anomalies:
        writer.writerow([
            a.get("id"), a.get("anomaly_type"), a.get("severity"), a.get("machine_id"), a.get("head_id"),
            a.get("detection_time", ""),
            a.get("status"), a.get("description"), a.get("resolution_notes", "")
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=aavin_anomalies_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return response

@router.get("/audit-manifest.csv")
def export_audit_manifest_csv(
    payload: dict = Depends(require_permission("report.export"))
):
    audit_events = audit_chain.read_stream(reverse=True)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Event Type", "Reading ID", "Machine ID", "Head ID",
        "Confirmed Value", "Delta", "User ID", "Server Time UTC", "Reading Hash", "Previous Hash"
    ])
    
    for ev in audit_events:
        writer.writerow([
            ev.get("event_id", ""),
            ev.get("event_type", ""),
            ev.get("reading_id", ""),
            ev.get("machine_id", ""),
            ev.get("head_id", ""),
            ev.get("confirmed_value", ""),
            ev.get("delta", ""),
            ev.get("user_id", ""),
            ev.get("server_time", ev.get("timestamp", "")),
            ev.get("reading_hash", ""),
            ev.get("prev_hash", "")
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=aavin_audit_manifest_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return response
