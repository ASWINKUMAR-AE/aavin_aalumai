# Technical & Operational Assumptions

1. **Backend Technology Stack**:
   - The master specification details FastAPI with PostgreSQL, SQLAlchemy 2.x, Alembic, and Pydantic. Python 3.12+ FastAPI is implemented as the authoritative backend.
   - For local development without Docker, an automated SQLite development fallback is supported in `DATABASE_URL` so all migrations, seeds, and unit tests run seamlessly without external service dependencies.
2. **Mobile Architecture**:
   - Mobile client is implemented in Flutter (Material 3, Riverpod, GoRouter, Camera, ML Kit OCR, encrypted SQLite) as specified in Sections 4.1 & 9.
3. **Plant Timezone**:
   - Default plant timezone is `Asia/Kolkata` (IST, UTC+05:30). All database timestamps are persisted in UTC and converted to plant local time for shift attribution.
4. **Machine Counter Limits**:
   - VFFS pouch packaging machine cumulative counter threshold is set to 1,000,000 packets. Witnessed supervisor reset formula: `(1,000,000 - Prev) + New`.
5. **Physical Device Hardware**:
   - On emulators or testing environments where camera hardware or ML Kit is unavailable, synthetic HMI sample test fixtures and calibrated ROI benchmarks are provided.
