import pytest
from app.services.backup_service import BackupService
from app.storage.store import (
    machines_store,
    heads_store,
    shift_handovers_store,
    downtime_store,
    users_store,
    readings_stream,
    anomalies_store
)


def test_backup_creation_and_integrity_verification():
    # 1. Trigger backup
    manifest = BackupService.create_backup(actor_id="test_admin", notes="Automated test backup")
    assert manifest["status"] == "verified"
    assert manifest["backup_filename"].endswith(".tar.gz")
    assert manifest["sha256"] is not None

    # 2. List backups
    backups = BackupService.list_backups()
    assert len(backups) >= 1
    found = any(b["backup_filename"] == manifest["backup_filename"] for b in backups)
    assert found is True

    # 3. Verify backup integrity
    verification = BackupService.verify_backup(manifest["backup_filename"])
    assert verification["valid"] is True
    assert verification["actual_sha256"] == manifest["sha256"]


def test_shift_handover_reconciliation():
    # Clean up any previous test artifact
    shift_handovers_store.delete("ho-test-1")
    handover_doc = {
        "id": "ho-test-1",
        "shift_id": "shift-1",
        "shift_name": "Shift 1 (Morning)",
        "handover_time": "2026-11-01T14:00:00Z",
        "outgoing_supervisor": "Venkatesh R.",
        "incoming_supervisor": "Senthil P.",
        "completed_heads_count": 12,
        "missing_heads_count": 0,
        "missing_head_codes": [],
        "total_shift_production": 42000,
        "total_shift_wastage": 120,
        "active_anomalies_count": 0,
        "handover_notes": "All 12 packaging heads operating within rated speed bands.",
        "status": "completed"
    }
    res = shift_handovers_store.insert(handover_doc)
    assert res["id"] == "ho-test-1"

    fetched = shift_handovers_store.get_by_id("ho-test-1")
    assert fetched is not None
    assert fetched["status"] == "completed"


def test_downtime_logging():
    # Clean up any previous test artifact
    downtime_store.delete("dt-test-1")
    downtime_doc = {
        "id": "dt-test-1",
        "machine_id": "SMP-01",
        "machine_code": "SMP-01",
        "head_id": "SMP-01-H1",
        "interruption_type": "film_roll_replacement",
        "reason": "Standard roll transition after 5,000 pouches",
        "duration_minutes": 8,
        "logged_by": "Murugan K.",
        "created_at": "2026-11-01T10:15:00Z"
    }
    res = downtime_store.insert(downtime_doc)
    assert res["id"] == "dt-test-1"

    fetched = downtime_store.get_by_id("dt-test-1")
    assert fetched is not None
    assert fetched["duration_minutes"] == 8

