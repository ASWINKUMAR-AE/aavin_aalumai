import os
import tempfile
import pytest
from app.storage.file_lock import FileLock, FileLockException
from app.storage.json_storage import JsonStorage, JsonStreamStorage
from app.storage.evidence_storage import EvidenceStorage
from app.services.hash_chain_service import HashChainService


def test_file_lock_mutual_exclusion():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        target_path = f.name

    try:
        lock1 = FileLock(target_path, timeout_seconds=1.0)
        lock2 = FileLock(target_path, timeout_seconds=0.2)

        # Acquire lock 1
        assert lock1.acquire() is True

        # Second lock attempt should time out
        with pytest.raises(FileLockException):
            lock2.acquire()

        # Release lock 1
        lock1.release()

        # Lock 2 can now acquire
        assert lock2.acquire() is True
        lock2.release()
    finally:
        if os.path.exists(target_path):
            os.remove(target_path)
        if os.path.exists(f"{target_path}.lock"):
            os.remove(f"{target_path}.lock")


def test_json_storage_atomic_crud():
    with tempfile.TemporaryDirectory() as tmp_dir:
        json_file = os.path.join(tmp_dir, "test_collection.json")
        storage = JsonStorage(json_file, id_field="id")

        # Initial state should be empty list
        assert storage.read_all() == []
        assert storage.count() == 0

        # Insert record
        rec = storage.insert({"id": "rec-1", "name": "Item 1", "count": 100})
        assert rec["id"] == "rec-1"
        assert storage.count() == 1

        # Fetch record
        fetched = storage.get_by_id("rec-1")
        assert fetched is not None
        assert fetched["name"] == "Item 1"

        # Update record
        updated = storage.update("rec-1", {"count": 250})
        assert updated is not None
        assert updated["count"] == 250
        assert storage.get_by_id("rec-1")["count"] == 250

        # Delete record
        deleted = storage.delete("rec-1")
        assert deleted is True
        assert storage.count() == 0
        assert storage.get_by_id("rec-1") is None


def test_json_stream_storage_append_only():
    with tempfile.TemporaryDirectory() as tmp_dir:
        stream_file = os.path.join(tmp_dir, "stream.jsonl")
        stream = JsonStreamStorage(stream_file)

        # Append events
        ev1 = stream.append_event({"event": "INIT", "val": 10})
        ev2 = stream.append_event({"event": "UPDATE", "val": 20})
        ev3 = stream.append_event({"event": "COMMIT", "val": 30})

        assert stream.count() == 3

        # Read chronological stream
        all_events = stream.read_stream()
        assert len(all_events) == 3
        assert all_events[0]["event"] == "INIT"
        assert all_events[2]["event"] == "COMMIT"

        # Read reverse stream
        rev_events = stream.read_stream(reverse=True)
        assert rev_events[0]["event"] == "COMMIT"
        assert rev_events[2]["event"] == "INIT"

        # Filtered stream
        updates = stream.read_stream(filter_func=lambda e: e.get("event") == "UPDATE")
        assert len(updates) == 1
        assert updates[0]["val"] == 20


def test_evidence_storage_sha256_verification():
    with tempfile.TemporaryDirectory() as tmp_dir:
        evidence_store = EvidenceStorage(tmp_dir)
        dummy_image_data = b"RIFF....WEBPVP8....MOCK_AAVIN_HMI_DISPLAY_IMAGE_DATA_BYTES_123456789"

        # Save evidence
        entry = evidence_store.save_evidence(
            image_bytes=dummy_image_data,
            original_filename="sample_hmi.jpg",
            mime_type="image/jpeg",
            machine_id="RMC-01",
            worker_id="usr-worker1"
        )

        assert entry["evidence_id"] is not None
        assert entry["image_sha256"] is not None
        assert entry["file_size"] == len(dummy_image_data)
        assert entry["verification_status"] == "verified"

        # Verify integrity on disk
        is_valid, msg = evidence_store.verify_file_integrity(entry["evidence_id"])
        assert is_valid is True
        assert "verified successfully" in msg

        # Duplicate detection test
        dup_entry = evidence_store.save_evidence(
            image_bytes=dummy_image_data,
            original_filename="sample_hmi_copy.jpg",
            mime_type="image/jpeg",
            machine_id="RMC-01",
            worker_id="usr-worker2"
        )
        assert dup_entry["is_duplicate"] is True
        assert dup_entry["verification_status"] == "duplicate_flagged"
