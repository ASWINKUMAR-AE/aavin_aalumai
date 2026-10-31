from datetime import datetime, timezone, date
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core.permissions import get_current_user_payload
from app.models.machine import Machine, Head, Variant, Shift
from app.models.reading import Reading
from app.models.operations import WastageEntry
from app.models.integrity import Anomaly, HashAnchor
from app.schemas.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    total_m = db.query(Machine).count()
    active_m = db.query(Machine).filter(Machine.is_active == True).count()
    total_h = db.query(Head).filter(Head.is_active == True).count()

    # Readings stats
    total_prod = db.query(func.coalesce(func.sum(Reading.production_delta), 0)).scalar()
    completed_readings = db.query(Reading).count()
    expected_readings = total_h * 3 # 3 shifts/day
    missing_readings = max(0, expected_readings - completed_readings)

    # Wastage
    self_wastage = (
        db.query(func.coalesce(func.sum(WastageEntry.packet_count), 0))
        .filter(WastageEntry.verification_status == "self_reported")
        .scalar()
    )
    verified_wastage = (
        db.query(func.coalesce(func.sum(WastageEntry.packet_count), 0))
        .filter(WastageEntry.verification_status == "verified")
        .scalar()
    )
    good_packets = max(0, total_prod - (self_wastage + verified_wastage))

    # Anomalies
    active_anomalies = db.query(Anomaly).filter(Anomaly.status == "active").count()
    critical_anomalies = db.query(Anomaly).filter(Anomaly.status == "active", Anomaly.severity == "Critical").count()

    # Hash Chain Status
    anchor = db.query(HashAnchor).order_by(HashAnchor.anchor_date.desc()).first()

    return DashboardSummaryResponse(
        total_machines=total_m,
        active_machines=active_m,
        total_heads=total_h,
        current_shift="Shift 1 (Morning)",
        expected_readings=expected_readings,
        completed_readings=completed_readings,
        missing_readings=missing_readings,
        total_recorded_production=total_prod,
        total_self_reported_wastage=self_wastage,
        total_verified_wastage=verified_wastage,
        total_good_packets=good_packets,
        active_anomalies=active_anomalies,
        critical_anomalies=critical_anomalies,
        hash_chain_status="Verified" if critical_anomalies == 0 else "Anomalies Detected",
        latest_daily_anchor_hash=anchor.manifest_hash if anchor else "0xGENESIS_ANCHOR_PENDING"
    )

@router.get("/production")
def get_production_chart_data(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    # Group by machine
    machines = db.query(Machine).filter(Machine.is_active == True).all()
    chart_data = []
    for m in machines:
        prod = (
            db.query(func.coalesce(func.sum(Reading.production_delta), 0))
            .filter(Reading.machine_id == m.id)
            .scalar()
        )
        chart_data.append({
            "machine": m.machine_code,
            "name": m.name,
            "type": m.machine_type,
            "production": prod
        })
    return chart_data
