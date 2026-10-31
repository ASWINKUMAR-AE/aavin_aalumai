# Aavin Aalumai Shift Counter Ledger — System Architecture

## 1. Architectural Overview

```text
                 AAVIN OFFICIALS & MANAGEMENT
                              |
                              v
             REACT + TYPESCRIPT WEB DASHBOARD
                              |
                              v
                       FASTAPI BACKEND
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
      POSTGRESQL            MINIO               REDIS
       DATABASE       EVIDENCE STORAGE         QUEUES
    (Append-Only)     (SHA-256 Verified)          |
          |                   |                   v
          +-------------------+          BACKGROUND WORKERS
                              |                   |
                              +--------> SHA-256 Chain Verification
                                         Anomaly Engine
                                         Daily Signed Hash Anchors
                                         Email Notifications

                    FLUTTER MOBILE CAPTURE
                              |
                         HTTPS API
                              |
                [ In-App Camera Only ]
                [ On-Device ML Kit OCR ]
                [ Monotonic Time Anchor ]
                [ Encrypted SQLite Queue ]
```

## 2. Machine & Head Layout

The platform configures 7 initial VFFS packing machines and 14 production heads:

| Machine ID | Machine Name | Type | Heads | Head IDs | QR Identifier | Rated Max Rate (pkts/hr) |
|---|---|---|---|---|---|---|
| M-RMC-01 | RMC Machine 1 | RMC | 2 | H-RMC-01-L, H-RMC-01-R | QR-AAVIN-RMC-01-L / R | 4,500 |
| M-RMC-02 | RMC Machine 2 | RMC | 2 | H-RMC-02-L, H-RMC-02-R | QR-AAVIN-RMC-02-L / R | 4,500 |
| M-SMP-01 | Samarpan Machine 1 | Samarpan | 2 | H-SMP-01-L, H-SMP-01-R | QR-AAVIN-SMP-01-L / R | 5,000 |
| M-SMP-02 | Samarpan Machine 2 | Samarpan | 2 | H-SMP-02-L, H-SMP-02-R | QR-AAVIN-SMP-02-L / R | 5,000 |
| M-SMP-03 | Samarpan Machine 3 | Samarpan | 2 | H-SMP-03-L, H-SMP-03-R | QR-AAVIN-SMP-03-L / R | 5,000 |
| M-ATM-01 | Atomic Engineers 1 | Atomic Engineers | 2 | H-ATM-01-L, H-ATM-01-R | QR-AAVIN-ATM-01-L / R | 4,800 |
| M-ATM-02 | Atomic Engineers 2 | Atomic Engineers | 2 | H-ATM-02-L, H-ATM-02-R | QR-AAVIN-ATM-02-L / R | 4,800 |

## 3. Cryptographic Hash Chain Specification

Each head maintains an independent SHA-256 hash chain starting from its Genesis block:

1. **Genesis Hash**:
   $$\text{genesis\_hash} = \text{SHA256}(\text{"GENESIS:"} + \text{head\_id} + \text{":"} + \text{created\_at})$$
2. **Reading Hash**:
   $$\text{reading\_hash} = \text{SHA256}(\text{canonical\_json}(\text{fields}) + \text{evidence\_sha256} + \text{server\_time} + \text{prev\_hash})$$
3. **Canonical JSON**: Key-sorted, explicit nulls, fixed float/integer formatting, ISO 8601 UTC timestamps with Z suffix.

## 4. Daily External Anchor Manifest

At day boundary (23:59:59 IST):
- Fetch latest hash for all 14 heads.
- Assemble JSON manifest with plant ID, date, head hashes, and timestamp.
- Compute SHA-256 root digest and Ed25519 signature.
- Store copy on write-once external storage and email to verified audit recipients.
