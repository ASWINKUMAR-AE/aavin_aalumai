import hashlib
import json
from datetime import datetime, timezone
import pytest
from app.services.hash_chain_service import canonical_json, HashChainService

def test_canonical_json_determinism():
    dict1 = {"b": 2, "a": 1, "c": None, "d": True}
    dict2 = {"d": True, "c": None, "a": 1, "b": 2}
    
    assert canonical_json(dict1) == '{"a":1,"b":2,"c":null,"d":true}'
    assert canonical_json(dict1) == canonical_json(dict2)

def test_genesis_hash_creation():
    dt = datetime(2026, 10, 31, 12, 0, 0, tzinfo=timezone.utc)
    genesis1 = HashChainService.create_genesis_hash("RMC-01-H1", "AAVIN://RMC-01/1", dt)
    genesis2 = HashChainService.create_genesis_hash("RMC-01-H1", "AAVIN://RMC-01/1", dt)
    assert len(genesis1) == 64
    assert genesis1 == genesis2

def test_reading_hash_calculation_and_tamper_detection():
    now_iso = datetime(2026, 10, 31, 14, 0, 0, tzinfo=timezone.utc).isoformat()
    evidence_sha = hashlib.sha256(b"sample_hmi_photo_bytes").hexdigest()
    prev_hash = "0" * 64
    
    valid_hash = HashChainService.calculate_reading_hash(
        reading_id="test-reading-1",
        machine_id="RMC-01",
        head_id="H1",
        count=845230,
        device_time_iso=now_iso,
        estimated_capture_time_iso=now_iso,
        server_time_iso=now_iso,
        variant_id="TM-500",
        user_id="W01",
        source="photo_ocr",
        evidence_sha256=evidence_sha,
        prev_hash=prev_hash
    )
    assert len(valid_hash) == 64

    # Tampering test 1: Modify count by +1
    tampered_count_hash = HashChainService.calculate_reading_hash(
        reading_id="test-reading-1",
        machine_id="RMC-01",
        head_id="H1",
        count=845231, # TAMPERED
        device_time_iso=now_iso,
        estimated_capture_time_iso=now_iso,
        server_time_iso=now_iso,
        variant_id="TM-500",
        user_id="W01",
        source="photo_ocr",
        evidence_sha256=evidence_sha,
        prev_hash=prev_hash
    )
    assert valid_hash != tampered_count_hash

    # Tampering test 2: Modify evidence image
    fake_evidence_sha = hashlib.sha256(b"fake_modified_photo").hexdigest()
    tampered_evidence_hash = HashChainService.calculate_reading_hash(
        reading_id="test-reading-1",
        machine_id="RMC-01",
        head_id="H1",
        count=845230,
        device_time_iso=now_iso,
        estimated_capture_time_iso=now_iso,
        server_time_iso=now_iso,
        variant_id="TM-500",
        user_id="W01",
        source="photo_ocr",
        evidence_sha256=fake_evidence_sha, # TAMPERED
        prev_hash=prev_hash
    )
    assert valid_hash != tampered_evidence_hash
