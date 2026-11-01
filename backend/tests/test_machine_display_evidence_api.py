import pytest
import io
import hashlib
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.display_evidence import MachineDisplayEvidence, MachineReadingOCR

client = TestClient(app)

@pytest.fixture
def worker_auth_headers():
    token = create_access_token(
        subject="test_worker_1",
        role="worker",
        permissions=["reading.capture", "reading.correction.request"]
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def official_auth_headers():
    token = create_access_token(
        subject="test_official_1",
        role="official",
        permissions=["reading.view", "evidence.view", "chain.verify"]
    )
    return {"Authorization": f"Bearer {token}"}

def test_upload_machine_display_evidence(worker_auth_headers):
    # Dummy JPEG image bytes
    fake_img = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08" + b"TEST_HMI_IMAGE_DATA_1234567890"
    expected_hash = hashlib.sha256(fake_img).hexdigest()

    response = client.post(
        "/api/v1/machine-readings/evidence",
        headers=worker_auth_headers,
        data={
            "machine_id": "SMP-01",
            "qr_id": "QR-003",
            "shift_id": "Shift 1 (Morning)",
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "device_id": "AAVIN-TEST-DEV",
        },
        files={"image": ("hmi_display.jpg", io.BytesIO(fake_img), "image/jpeg")},
    )

    assert response.status_code == 200
    data = response.json()
    assert "evidence_id" in data
    assert "evidence_uuid" in data
    assert data["image_sha256"] == expected_hash
    assert data["upload_status"] == "uploaded"
    assert "/api/v1/machine-readings/evidence/" in data["image_url"]

def test_duplicate_evidence_hash_flagging(worker_auth_headers):
    fake_img = b"\xff\xd8\xff\xe0TEST_DUPLICATE_IMAGE_PAYLOAD_9999"
    
    # First upload
    res1 = client.post(
        "/api/v1/machine-readings/evidence",
        headers=worker_auth_headers,
        data={"machine_id": "SMP-01", "qr_id": "QR-003"},
        files={"image": ("disp.jpg", io.BytesIO(fake_img), "image/jpeg")},
    )
    assert res1.status_code == 200

    # Second upload with identical bytes
    res2 = client.post(
        "/api/v1/machine-readings/evidence",
        headers=worker_auth_headers,
        data={"machine_id": "SMP-01", "qr_id": "QR-003"},
        files={"image": ("disp.jpg", io.BytesIO(fake_img), "image/jpeg")},
    )
    assert res2.status_code == 200
    ev_id2 = res2.json()["evidence_id"]

    # Verify duplicate was detected and recorded
    detail_res = client.get(f"/api/v1/machine-readings/evidence/{ev_id2}", headers=worker_auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["verification_status"] == "duplicate_flagged"

def test_submit_dual_head_readings_linked_to_single_evidence(worker_auth_headers):
    # 1. Upload evidence
    fake_img = b"\xff\xd8\xff\xe0HMI_DUAL_HEAD_VERIFICATION_8888"
    ev_res = client.post(
        "/api/v1/machine-readings/evidence",
        headers=worker_auth_headers,
        data={"machine_id": "SMP-01", "qr_id": "QR-003"},
        files={"image": ("dual_head.jpg", io.BytesIO(fake_img), "image/jpeg")},
    )
    assert ev_res.status_code == 200
    evidence_id = ev_res.json()["evidence_id"]

    # 2. Submit dual-head confirmed readings
    submit_payload = {
        "evidence_id": evidence_id,
        "machine_id": "SMP-01",
        "qr_id": "QR-003",
        "shift_id": "Shift 1 (Morning)",
        "device_time": datetime.now(timezone.utc).isoformat(),
        "head_readings": [
            {
                "head_number": 1,
                "head_label": "HEAD - A",
                "production_ocr_value": 229910,
                "wastage_ocr_value": 1212,
                "variant_ocr_value": "1000ml",
                "production_confirmed_value": 229910,
                "wastage_confirmed_value": 1212,
                "variant_confirmed_value": "1000ml",
                "machine_speed_ocr": 50,
                "recipe_no_ocr": 3,
                "ocr_confidence": 0.98,
                "correction_status": "original",
            },
            {
                "head_number": 2,
                "head_label": "HEAD - B",
                "production_ocr_value": 376760,
                "wastage_ocr_value": 2490,
                "variant_ocr_value": "500ML",
                "production_confirmed_value": 376761, # Worker corrected +1
                "wastage_confirmed_value": 2491,
                "variant_confirmed_value": "500ML",
                "machine_speed_ocr": 65,
                "recipe_no_ocr": 2,
                "ocr_confidence": 0.99,
                "correction_status": "corrected",
                "correction_reason": "Last digit partially blurred",
            },
        ],
    }

    sub_res = client.post("/api/v1/machine-readings", headers=worker_auth_headers, json=submit_payload)
    assert sub_res.status_code == 200
    readings = sub_res.json()
    assert len(readings) == 2

    # Verify both heads link to same evidence_id
    assert readings[0]["evidence_id"] == evidence_id
    assert readings[1]["evidence_id"] == evidence_id
    assert readings[0]["head_number"] == 1
    assert readings[1]["head_number"] == 2
    assert readings[0]["correction_status"] == "original"
    assert readings[1]["correction_status"] == "corrected"
    assert readings[1]["correction_reason"] == "Last digit partially blurred"

def test_download_evidence_image_from_storage(worker_auth_headers, official_auth_headers):
    fake_img = b"\xff\xd8\xff\xe0HMI_IMAGE_STREAM_TEST_7777"
    upload = client.post(
        "/api/v1/machine-readings/evidence",
        headers=worker_auth_headers,
        data={"machine_id": "SMP-01"},
        files={"image": ("stream_test.jpg", io.BytesIO(fake_img), "image/jpeg")},
    )
    evidence_id = upload.json()["evidence_id"]

    # Official downloads image
    img_res = client.get(f"/api/v1/machine-readings/evidence/{evidence_id}/image")
    assert img_res.status_code == 200
    assert img_res.content == fake_img
    assert img_res.headers.get("x-evidence-sha256") is not None
