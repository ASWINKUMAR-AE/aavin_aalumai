import os
import uuid
from datetime import datetime, timezone, time
from typing import Dict, Any, List, Optional
from app.storage.json_storage import JsonStorage, JsonStreamStorage
from app.storage.evidence_storage import EvidenceStorage
from app.core.security import hash_password
from app.services.hash_chain_service import HashChainService
from app.services.qr_service import PRIMARY_MACHINES_CONFIG, build_qr_payload
from app.core.logging import logger

DATA_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))

# Storage instances
users_store = JsonStorage(os.path.join(DATA_ROOT, "users", "users.json"), id_field="id")
login_attempts_store = JsonStreamStorage(os.path.join(DATA_ROOT, "users", "login_attempts.jsonl"))

machines_store = JsonStorage(os.path.join(DATA_ROOT, "machines", "machines.json"), id_field="id")
heads_store = JsonStorage(os.path.join(DATA_ROOT, "machines", "heads.json"), id_field="id")
head_thresholds_store = JsonStorage(os.path.join(DATA_ROOT, "machines", "head_thresholds.json"), id_field="id")

shifts_store = JsonStorage(os.path.join(DATA_ROOT, "shifts", "shifts.json"), id_field="id")
variants_store = JsonStorage(os.path.join(DATA_ROOT, "config", "variants.json"), id_field="id")
anomalies_store = JsonStorage(os.path.join(DATA_ROOT, "config", "anomalies.json"), id_field="id")
resets_store = JsonStorage(os.path.join(DATA_ROOT, "config", "resets.json"), id_field="id")
idempotency_store = JsonStorage(os.path.join(DATA_ROOT, "config", "idempotency.json"), id_field="idempotency_key")
qr_history_store = JsonStreamStorage(os.path.join(DATA_ROOT, "config", "qr_history.jsonl"))

wastage_store = JsonStorage(os.path.join(DATA_ROOT, "config", "wastage.json"), id_field="id")
dispatch_store = JsonStorage(os.path.join(DATA_ROOT, "config", "dispatch.json"), id_field="id")
milk_balance_store = JsonStorage(os.path.join(DATA_ROOT, "config", "milk_balance.json"), id_field="id")
calibrations_store = JsonStorage(os.path.join(DATA_ROOT, "config", "calibrations.json"), id_field="id")

# Append-only ledgers
readings_stream = JsonStreamStorage(os.path.join(DATA_ROOT, "readings", "readings_stream.jsonl"))
machine_ocr_stream = JsonStreamStorage(os.path.join(DATA_ROOT, "readings", "machine_ocr_stream.jsonl"))
audit_chain = JsonStreamStorage(os.path.join(DATA_ROOT, "audit", "audit_chain.jsonl"))

# Private filesystem evidence storage
evidence_storage = EvidenceStorage(os.path.join(DATA_ROOT, "evidence"))


def init_file_storage():
    """
    Seeds initial database-free data if not already present.
    Authoritative configuration: 6 machines, 12 heads, 3 shifts, 4 variants, 5 users.
    """
    logger.info(f"Initializing file-based persistence at: {DATA_ROOT}")
    now_utc = datetime.now(timezone.utc)

    # 1. Seed Users
    if users_store.count() == 0:
        users_seed = [
            ("worker1", "worker1@aavin.tn.gov.in", "Worker@12345", "Murugan K.", "EMP-W01", "worker"),
            ("worker2", "worker2@aavin.tn.gov.in", "Worker@12345", "Senthil P.", "EMP-W02", "worker"),
            ("supervisor1", "supervisor1@aavin.tn.gov.in", "Supervisor@12345", "Venkatesh R.", "EMP-S01", "supervisor"),
            ("official1", "official1@aavin.tn.gov.in", "Official@12345", "Dr. Meenakshi S.", "EMP-O01", "official"),
            ("admin1", "admin1@aavin.tn.gov.in", "Admin@12345", "Aswin Kumar", "EMP-A01", "admin"),
        ]
        for username, email, pwd, name, code, role in users_seed:
            users_store.insert({
                "id": str(uuid.uuid4()),
                "username": username,
                "email": email,
                "hashed_password": hash_password(pwd),
                "full_name": name,
                "employee_code": code,
                "role": role,
                "is_active": True,
                "is_locked": False,
                "created_at": now_utc.isoformat(),
                "updated_at": now_utc.isoformat()
            })
        logger.info(f"Seeded {len(users_seed)} initial users into file storage.")

    # 2. Seed Shifts
    if shifts_store.count() == 0:
        shifts_seed = [
            ("Shift 1 (Morning)", "06:00:00", "14:00:00"),
            ("Shift 2 (Evening)", "14:00:00", "22:00:00"),
            ("Shift 3 (Night)", "22:00:00", "06:00:00"),
        ]
        for sname, start, end in shifts_seed:
            shifts_store.insert({
                "id": str(uuid.uuid4()),
                "name": sname,
                "start_time": start,
                "end_time": end,
                "is_active": True,
                "created_at": now_utc.isoformat(),
            })
        logger.info(f"Seeded {len(shifts_seed)} shifts into file storage.")

    # 3. Seed Variants
    if variants_store.count() == 0:
        variants_seed = [
            ("TM-500", "Aavin Toned Milk (Blue)", 3.0, 8.5, 500, 20, "#0A73C0"),
            ("SM-500", "Aavin Standardized Milk (Green)", 4.5, 8.5, 500, 20, "#7CB340"),
            ("FCM-500", "Aavin Full Cream Milk (Orange)", 6.0, 9.0, 500, 20, "#FF8C00"),
            ("DTM-500", "Aavin Double Toned Milk (Magenta)", 1.5, 9.0, 500, 20, "#C2185B"),
        ]
        for vcode, vname, fat, snf, vol, crate, color in variants_seed:
            variants_store.insert({
                "id": str(uuid.uuid4()),
                "code": vcode,
                "name": vname,
                "fat_percentage": fat,
                "snf_percentage": snf,
                "pouch_volume_ml": vol,
                "pouches_per_crate": crate,
                "color_code": color,
                "is_active": True,
                "created_at": now_utc.isoformat()
            })
        logger.info(f"Seeded {len(variants_seed)} milk variants into file storage.")

    # 4. Seed Machines & Heads (Exactly 6 primary machines, 12 heads)
    if machines_store.count() == 0:
        for cfg in PRIMARY_MACHINES_CONFIG:
            m_code = cfg["machine_id"]
            m_name = cfg["machine_name"]
            m_type = cfg["machine_type"]
            qr_id = cfg["qr_id"]
            heads_count = cfg["heads"]
            payload = build_qr_payload(m_code, qr_id, 1)

            machine_id = str(uuid.uuid4())
            machine_doc = {
                "id": machine_id,
                "machine_code": m_code,
                "name": m_name,
                "machine_type": m_type,
                "total_heads": heads_count,
                "qr_id": qr_id,
                "qr_version": 1,
                "qr_payload": payload,
                "qr_status": "active",
                "is_active": True,
                "created_at": now_utc.isoformat(),
                "updated_at": now_utc.isoformat()
            }
            machines_store.insert(machine_doc)

            for h_num in range(1, heads_count + 1):
                h_code = f"{m_code}-H{h_num}"
                head_qr = f"AAVIN://MADURAI/DAIRY/{m_code}/HEAD_{h_num}"
                genesis_hash = HashChainService.create_genesis_hash(
                    head_code=h_code,
                    qr_identifier=head_qr,
                    created_at=now_utc
                )
                head_id = str(uuid.uuid4())
                heads_store.insert({
                    "id": head_id,
                    "machine_id": machine_id,
                    "head_code": h_code,
                    "head_number": h_num,
                    "qr_identifier": head_qr,
                    "rated_speed_per_hour": 2500,
                    "genesis_hash": genesis_hash,
                    "current_hash": genesis_hash,
                    "latest_counter": 0,
                    "latest_reading_time": None,
                    "is_active": True,
                    "created_at": now_utc.isoformat()
                })

                head_thresholds_store.insert({
                    "id": str(uuid.uuid4()),
                    "head_id": head_id,
                    "max_rate_per_hour": 3000,
                    "min_shift_expected": 500,
                    "late_minutes_flag": 15,
                    "time_offset_flag_seconds": 300
                })

        logger.info("Successfully seeded 6 primary machines and 12 heads into file storage.")
