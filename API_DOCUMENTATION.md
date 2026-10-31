# API Documentation & Contracts

Base URL: `/api/v1`

## 1. Authentication
- `POST /api/v1/auth/login` - Request: `{email, password}` -> Response: `{access_token, refresh_token, user}`
- `POST /api/v1/auth/refresh` - Request: `{refresh_token}` -> Response: `{access_token, refresh_token}`
- `POST /api/v1/auth/logout` - Revokes refresh token and session.
- `GET /api/v1/auth/me` - Authenticated user details, roles, and permissions.

## 2. Machines & Heads
- `GET /api/v1/machines` - List all 7 VFFS packing machines.
- `GET /api/v1/machines/{id}` - Details with associated heads.
- `GET /api/v1/heads/{id}` - Details, genesis hash, latest hash, rated rate.
- `GET /api/v1/heads/{id}/history` - Historical readings and chain links.

## 3. Readings & Evidence
- `POST /api/v1/readings` - Submit reading (multipart/form-data with evidence photo or JSON with pre-uploaded photo key).
- `GET /api/v1/readings` - Filtered list of historical readings (read-only).
- `GET /api/v1/readings/{id}` - Reading details, hashes, flags, evidence link.
- `GET /api/v1/readings/{id}/evidence` - Authenticated short-lived signed evidence URL.
- `POST /api/v1/readings/{id}/corrections` - Append-only correction request.

## 4. Resets (Witnessed 1,000,000 Procedure)
- `POST /api/v1/resets` - Worker requests reset with before-reset photo.
- `POST /api/v1/resets/{id}/approve` - Supervisor approves reset with after-reset photo.
- `GET /api/v1/resets` - List pending and approved reset events.

## 5. Hash Chain & Anchors
- `GET /api/v1/heads/{id}/chain-status` - Complete chain integrity verification.
- `POST /api/v1/heads/{id}/verify-chain` - Run full SHA-256 verification traversal.
- `GET /api/v1/anchors` - List daily signed hash anchor manifests.
- `GET /api/v1/anchors/{id}` - Detailed manifest with cryptographic signature.

## 6. Dashboard & Reports
- `GET /api/v1/dashboard/summary` - Aggregated KPIs for machines, heads, readings, anomalies, chain integrity.
- `GET /api/v1/dashboard/production` - Time-series production charts.
- `GET /api/v1/reports/production.csv` - Download CSV report.
- `GET /api/v1/reports/production.pdf` - Download PDF report.
