# Aavin Aalumai Shift Counter Ledger — Security Specification

## 1. Authentication & Session Management
- **Password Storage**: Argon2id with 64MB memory cost, 3 iterations, 4 parallelism lanes.
- **JWT Tokens**:
  - Access Token: Short-lived (60 minutes), signed with HS256/RS256.
  - Refresh Token: Long-lived (7 days), stored in database with rotation and revocation on logout/re-issue.
- **Brute Force Protection**: Account lockout after 5 consecutive failed attempts for 15 minutes.

## 2. Append-Only Database Policy
- PostgreSQL triggers reject any `UPDATE` or `DELETE` on the `readings`, `reset_events`, and `hash_anchors` tables.
- All corrections are append-only rows referencing the original reading with full audit justification.

## 3. Evidence Protection
- In-app camera only. Mobile client disables system gallery pickers or file uploads.
- Original image SHA-256 calculated on capture and verified on receipt by the backend.
- Evidence files stored in MinIO/S3 using UUID object keys, protected by pre-signed short-lived URLs.

## 4. Mobile Integrity Signals
- Root & emulator detection risk signals.
- Monotonic clock offset comparison against server synchronization anchors.
- Unverified time flags applied when device boot identifier changes or clock delta exceeds threshold.
