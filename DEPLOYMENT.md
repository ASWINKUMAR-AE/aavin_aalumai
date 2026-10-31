# Deployment Guide

## 1. Production Docker Deployment
```bash
docker compose -f docker-compose.yml up --build -d
```
All persistent data resides in docker volumes:
- `pgdata` - PostgreSQL relational storage
- `miniodata` - Encrypted evidence objects
- `redisdata` - Task and cache state

## 2. Nginx Reverse Proxy
Nginx routes all public incoming traffic:
- `/` -> React Official Dashboard
- `/api/` -> FastAPI backend cluster
- `/docs` -> Swagger UI (restricted in production)

## 3. Disaster Recovery & Backups
Daily automated backups:
- PostgreSQL dump: `pg_dump -U postgres aavin_ledger > /backups/aavin_$(date +%Y%m%d).sql`
- External Anchor Manifests stored in write-once WORM cloud storage bucket.
