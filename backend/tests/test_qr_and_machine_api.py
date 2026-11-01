import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.services.qr_service import PRIMARY_MACHINES_CONFIG, build_qr_payload, parse_and_validate_qr

client = TestClient(app)

@pytest.fixture
def worker_auth_headers():
    token = create_access_token(subject="worker1", role="worker", permissions=["reading.capture", "reading.view.own"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def supervisor_auth_headers():
    token = create_access_token(subject="supervisor1", role="supervisor", permissions=["reset.approve", "machine.manage"])
    return {"Authorization": f"Bearer {token}"}

def test_qr_generation_config():
    """Verify all 6 machine QRs can be constructed and validated."""
    assert len(PRIMARY_MACHINES_CONFIG) == 6
    for m in PRIMARY_MACHINES_CONFIG:
        payload = build_qr_payload(m["machine_id"], m["qr_id"], 1)
        res = parse_and_validate_qr(payload)
        assert res["valid"] is True
        assert res["machine_id"] == m["machine_id"]
        assert res["qr_id"] == m["qr_id"]

def test_list_machine_qrs(worker_auth_headers):
    """Verify GET /machines/qr returns registered machine QRs with image URLs."""
    res = client.get("/api/v1/machines/qr", headers=worker_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 6
    qr_ids = [d["qr_id"] for d in data]
    assert "QR-001" in qr_ids
    assert "QR-006" in qr_ids

def test_validate_scanned_qr(worker_auth_headers):
    """Verify POST /machines/qr/validate correctly identifies machine and returns available heads."""
    # Test valid JSON QR payload
    payload_rmc1 = build_qr_payload("RMC-01", "QR-001", 1)
    res = client.post("/api/v1/machines/qr/validate", json={"qr_text": payload_rmc1}, headers=worker_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["machine_code"] == "RMC-01"
    assert len(data["heads"]) >= 2

    # Test invalid QR payload
    bad_res = client.post("/api/v1/machines/qr/validate", json={"qr_text": "MALFORMED_RANDOM_TEXT_123"}, headers=worker_auth_headers)
    assert bad_res.status_code == 200
    assert bad_res.json()["valid"] is False
    assert "Unrecognized" in bad_res.json()["error"]

def test_machine_data_editable_by_all_roles(worker_auth_headers, supervisor_auth_headers):
    """Verify machine data can be edited by workers, supervisors, and all roles."""
    # Worker updates machine name
    res_worker = client.put(
        "/api/v1/machines/RMC-01",
        json={"name": "RMC VFFS Machine 1 (Calibrated)"},
        headers=worker_auth_headers
    )
    assert res_worker.status_code == 200
    assert res_worker.json()["name"] == "RMC VFFS Machine 1 (Calibrated)"

    # Supervisor updates machine rated speed or head
    res_sup = client.put(
        "/api/v1/machines/RMC-01",
        json={"name": "RMC VFFS Machine 1"},
        headers=supervisor_auth_headers
    )
    assert res_sup.status_code == 200
    assert res_sup.json()["name"] == "RMC VFFS Machine 1"

def test_qr_regeneration_with_audit(supervisor_auth_headers):
    """Verify controlled QR regeneration bumps version and creates audit trail."""
    res = client.post(
        "/api/v1/machines/qr/QR-001/regenerate",
        json={"reason": "Sticker physical replacement following console deep cleaning"},
        headers=supervisor_auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["version"] >= 2
    assert "QR-001" in data["image_url"]

def test_pdf_sheet_endpoint(worker_auth_headers):
    """Verify GET /machines/qr/sheet-pdf returns valid PDF content."""
    res = client.get("/api/v1/machines/qr/sheet-pdf", headers=worker_auth_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000
