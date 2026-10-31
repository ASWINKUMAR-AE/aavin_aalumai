import pytest
from app.core.permissions import ROLE_PERMISSIONS

def test_rbac_roles_exist():
    assert "worker" in ROLE_PERMISSIONS
    assert "supervisor" in ROLE_PERMISSIONS
    assert "official" in ROLE_PERMISSIONS
    assert "admin" in ROLE_PERMISSIONS

def test_worker_cannot_admin():
    worker_perms = ROLE_PERMISSIONS["worker"]
    assert "reading.capture" in worker_perms
    assert "machine.manage" not in worker_perms
    assert "user.manage" not in worker_perms
    assert "reset.approve" not in worker_perms

def test_official_is_read_only():
    official_perms = ROLE_PERMISSIONS["official"]
    assert "reading.view.all" in official_perms
    assert "report.export" in official_perms
    # Cannot write or capture
    assert "reading.capture" not in official_perms
    assert "reset.approve" not in official_perms
    assert "machine.manage" not in official_perms

def test_supervisor_permissions():
    supervisor_perms = ROLE_PERMISSIONS["supervisor"]
    assert "reset.approve" in supervisor_perms
    assert "anomaly.review" in supervisor_perms
    assert "wastage.verify" in supervisor_perms
    assert "machine.manage" not in supervisor_perms
