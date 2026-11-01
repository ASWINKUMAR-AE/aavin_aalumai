from datetime import datetime, timezone, time
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import hash_password
from app.models.auth import User
from app.models.machine import Machine, Head, Variant, Shift, Slot, HeadThreshold
from app.services.hash_chain_service import HashChainService
from app.core.logging import logger

def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Seed Users
        users_data = [
            ("worker1", "worker1@aavin.tn.gov.in", "Worker@12345", "Murugan K.", "EMP-W01", "worker"),
            ("worker2", "worker2@aavin.tn.gov.in", "Worker@12345", "Senthil P.", "EMP-W02", "worker"),
            ("supervisor1", "supervisor1@aavin.tn.gov.in", "Supervisor@12345", "Venkatesh R.", "EMP-S01", "supervisor"),
            ("official1", "official1@aavin.tn.gov.in", "Official@12345", "Dr. Meenakshi S.", "EMP-O01", "official"),
            ("admin1", "admin1@aavin.tn.gov.in", "Admin@12345", "Aswin Kumar", "EMP-A01", "admin"),
        ]
        
        for username, email, pwd, name, code, role in users_data:
            existing = db.query(User).filter(User.username == username).first()
            if not existing:
                u = User(
                    username=username,
                    email=email,
                    hashed_password=hash_password(pwd),
                    full_name=name,
                    employee_code=code,
                    role=role,
                    is_active=True
                )
                db.add(u)
        db.commit()

        # 2. Seed Shifts
        shifts_data = [
            ("Shift 1 (Morning)", time(6, 0), time(14, 0)),
            ("Shift 2 (Evening)", time(14, 0), time(22, 0)),
            ("Shift 3 (Night)", time(22, 0), time(6, 0)),
        ]
        created_shifts = {}
        for sname, start, end in shifts_data:
            s = db.query(Shift).filter(Shift.name == sname).first()
            if not s:
                s = Shift(name=sname, start_time=start, end_time=end, is_active=True)
                db.add(s)
                db.flush()
            created_shifts[sname] = s
        db.commit()

        # 3. Seed Variants
        variants_data = [
            ("TM-500", "Aavin Toned Milk (Blue)", 3.0, 8.5, 500, 20, "#0A73C0"),
            ("SM-500", "Aavin Standardized Milk (Green)", 4.5, 8.5, 500, 20, "#7CB340"),
            ("FCM-500", "Aavin Full Cream Milk (Orange)", 6.0, 9.0, 500, 20, "#FF8C00"),
            ("DTM-500", "Aavin Double Toned Milk (Magenta)", 1.5, 9.0, 500, 20, "#C2185B"),
        ]
        for vcode, vname, fat, snf, vol, crate, color in variants_data:
            v = db.query(Variant).filter(Variant.code == vcode).first()
            if not v:
                v = Variant(
                    code=vcode,
                    name=vname,
                    fat_percentage=fat,
                    snf_percentage=snf,
                    pouch_volume_ml=vol,
                    pouches_per_crate=crate,
                    color_code=color,
                    is_active=True
                )
                db.add(v)
        db.commit()

        # 4. Seed the 6 Primary Machines & 12 Heads (Six Machine Configuration)
        # QR-001: RMC-01 (RMC, 2 heads)
        # QR-002: RMC-02 (RMC, 2 heads)
        # QR-003: SMP-01 (Samarpan, 2 heads)
        # QR-004: SMP-02 (Samarpan, 2 heads)
        # QR-005: SMP-03 (Samarpan, 2 heads)
        # QR-006: ATM-01 (Atomic Engineers, 2 heads)
        from app.services.qr_service import PRIMARY_MACHINES_CONFIG, build_qr_payload

        now_utc = datetime.now(timezone.utc)

        for cfg in PRIMARY_MACHINES_CONFIG:
            m_code = cfg["machine_id"]
            m_name = cfg["machine_name"]
            m_type = cfg["machine_type"]
            qr_id = cfg["qr_id"]
            heads_count = cfg["heads"]
            payload = build_qr_payload(m_code, qr_id, 1)

            machine = db.query(Machine).filter(Machine.machine_code == m_code).first()
            if not machine:
                # Also check legacy alias
                legacy_code = "SAMARPAN" + m_code[3:] if m_code.startswith("SMP") else ("ATOMIC" + m_code[3:] if m_code.startswith("ATM") else None)
                if legacy_code:
                    machine = db.query(Machine).filter(Machine.machine_code == legacy_code).first()
                    if machine:
                        machine.machine_code = m_code
                
            if not machine:
                machine = Machine(
                    machine_code=m_code,
                    name=m_name,
                    machine_type=m_type,
                    total_heads=heads_count,
                    qr_id=qr_id,
                    qr_version=1,
                    qr_payload=payload,
                    qr_status="active",
                    is_active=True
                )
                db.add(machine)
                db.flush()
            else:
                machine.qr_id = qr_id
                machine.qr_payload = payload
                machine.qr_status = "active"

            # Create 2 Heads for this machine
            for h_num in range(1, heads_count + 1):
                h_code = f"{m_code}-H{h_num}"
                head_qr = f"AAVIN://MADURAI/DAIRY/{m_code}/HEAD_{h_num}"
                
                head = db.query(Head).filter(Head.head_code == h_code).first()
                if not head:
                    genesis_hash = HashChainService.create_genesis_hash(
                        head_code=h_code,
                        qr_identifier=head_qr,
                        created_at=now_utc
                    )
                    head = Head(
                        machine_id=machine.id,
                        head_code=h_code,
                        head_number=h_num,
                        qr_identifier=head_qr,
                        rated_speed_per_hour=2500,
                        genesis_hash=genesis_hash,
                        current_hash=genesis_hash,
                        is_active=True
                    )
                    db.add(head)
                    db.flush()

                    threshold = HeadThreshold(
                        head_id=head.id,
                        max_rate_per_hour=3000,
                        min_shift_expected=500,
                        late_minutes_flag=15,
                        time_offset_flag_seconds=300
                    )
                    db.add(threshold)
        
        db.commit()
        logger.info("Successfully seeded Aavin Aalumai Shift Counter Ledger with 7 machines and 14 heads.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
