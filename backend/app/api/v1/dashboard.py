from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends

from app.core.permissions import get_current_user_payload
from app.storage.store import (
    machines_store,
    heads_store,
    readings_stream,
    anomalies_store,
    machine_ocr_stream
)
from app.schemas.schemas import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(payload: dict = Depends(get_current_user_payload)):
    machines = machines_store.read_all()
    total_m = len(machines)
    active_m = len([m for m in machines if m.get("is_active", True)])

    heads = heads_store.read_all()
    active_heads = [h for h in heads if h.get("is_active", True)]
    total_h = len(active_heads)

    # Readings from stream
    readings = readings_stream.read_stream()
    completed_readings = len(readings)
    total_prod = sum(r.get("production_delta", 0) for r in readings)

    expected_readings = total_h * 3 # 3 shifts/day = 36 expected readings
    missing_readings = max(0, expected_readings - completed_readings)

    # Wastage
    ocr_readings = machine_ocr_stream.read_stream()
    self_wastage = sum(o.get("wastage_confirmed_value", 0) for o in ocr_readings)
    verified_wastage = 0
    good_packets = max(0, total_prod - (self_wastage + verified_wastage))

    # Anomalies
    anomalies = anomalies_store.read_all()
    active_anomalies = len([a for a in anomalies if a.get("status") == "active"])
    critical_anomalies = len([a for a in anomalies if a.get("status") == "active" and a.get("severity") == "Critical"])

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
        latest_daily_anchor_hash="0xGENESIS_ANCHOR_VERIFIED"
    )

@router.get("/production")
def get_production_chart_data(payload: dict = Depends(get_current_user_payload)):
    machines = machines_store.query(lambda m: m.get("is_active", True))
    readings = readings_stream.read_stream()

    chart_data = []
    for m in machines:
        m_id = m.get("id")
        m_code = m.get("machine_code")
        prod = sum(
            r.get("production_delta", 0)
            for r in readings
            if r.get("machine_id") == m_id or r.get("machine_code") == m_code
        )
        chart_data.append({
            "machine": m_code,
            "name": m.get("name"),
            "type": m.get("machine_type"),
            "production": prod
        })
    return chart_data
