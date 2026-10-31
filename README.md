# Aavin Aalumai Shift Counter Ledger (ஆவின் ஆளுமை)
### Production-Grade Industrial Milk Production Monitoring & Tamper-Evident Evidence Platform

An integrated dairy packaging monitoring and tamper-evident evidence ledger system engineered for **Aavin (Tamil Nadu Cooperative Milk Producers' Federation Limited)** milk plants.

---

## 🥛 System Architecture

The platform consists of three integrated components backed by a single authoritative database and cryptographic audit trail:

1. **React Native (Expo) Mobile App**: Industrial operator and supervisor Android capture tool with guided camera HMI alignment, on-device OCR, tamper-evident hash calculation, monotonic time anchoring, and offline encrypted queuing.
2. **FastAPI + PostgreSQL Backend**: Authoritative source of truth with append-only database triggers, independent SHA-256 hash chains per machine head, deterministic rollover production calculations `(1,000,000 - prev) + new`, anomaly detection engine, and daily KMS-signed external hash anchors.
3. **React + TypeScript Official Web Dashboard**: Industrial desktop dashboard for Aavin General Managers and Quality Officials featuring live production tracking, side-by-side HMI evidence viewing, hash-chain verification, milk mass balance, calibration offset trends, and CSV/PDF export.

---

## 🏭 Configured Packaging Units (7 Machines • 14 Heads)

| Machine Type | Units | Heads / Machine | Total Heads | Unique QR Prefix | Rated Speed |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **RMC VFFS** | 2 | 2 | 4 | `AAVIN://MADURAI/DAIRY/RMC-01...` | 2,500 pkts/hr |
| **Samarpan Integrus** | 3 | 2 | 6 | `AAVIN://MADURAI/DAIRY/SAMARPAN-01...` | 2,500 pkts/hr |
| **Atomic Engineers** | 2 | 2 | 4 | `AAVIN://MADURAI/DAIRY/ATOMIC-01...` | 2,500 pkts/hr |
| **TOTAL** | **7** | — | **14** | All 14 Heads Genesis Sealed | Max: 3,000/hr |

---

## 🛡️ Critical Industrial Business Rules

1. **Camera-Only Evidence**: Physical HMI counter readings are captured strictly through the in-app camera with blur and glare validation. Gallery uploads and file pickers are strictly prohibited.
2. **Append-Only Immutability**: Historical counter observations can never be edited or deleted by any user or administrator. Corrections are recorded as separate referenced records.
3. **Dual-Person Reset Protocol**: Manual counter rollovers (threshold: 1,000,000) require Before-Reset and After-Reset photographs, worker submission, and personal supervisor witness authentication. A supervisor cannot witness their own reset.
4. **Independent Hash Chains**: Each of the 14 heads maintains an independent SHA-256 chain starting from a deterministic Genesis block:
   $$\text{Reading Hash} = \text{SHA256}(\text{CanonicalJSON}(\text{fields}) + \text{EvidenceSHA256} + \text{ServerTime} + \text{PrevHash})$$
5. **Strict Wastage Separation**: Self-reported wastage remains segregated from verified wastage and is never merged with counter production figures.
6. **Calibration Display Rule**: Recorded counter production and adjusted production (measured offset) are always displayed separately.

---

## 🚀 Quick Start (Local Development)

### 1. Docker Compose (Full Stack)
```bash
docker compose up --build
```
- **Web Dashboard**: `http://localhost:3000` (or `http://localhost`)
- **FastAPI Backend & Swagger**: `http://localhost:8000/docs`
- **MinIO Console**: `http://localhost:9001` (User: `minioadmin` / `minioadminpassword`)

### 2. React Native Expo Mobile App
```bash
# In project root
npx expo start
```
Scan the in-terminal QR code with **Expo Go** on Android or run `npx expo run:android`.

### 3. Backend Direct Launch
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
pip install -r requirements.txt
python app/db/init_db.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔑 Demo Seed Accounts

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Worker (Operator)** | `worker1` | `Worker@12345` | Scan QR, HMI camera capture, confirm OCR, submit readings |
| **Supervisor** | `supervisor1` | `Supervisor@12345` | Shift monitoring, two-person reset approval, anomaly review |
| **Official (Auditor)** | `official1` | `Official@12345` | Read-only executive dashboard, evidence viewer, hash chains |
| **System Admin** | `admin1` | `Admin@12345` | User management, threshold settings, immutable audit logs |

---

## 📜 Repository Information
- **Primary Git Repository**: `https://github.com/ASWINKUMAR-AE/aavin_aalumai.git`
- **Default Branch**: `main`
