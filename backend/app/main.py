from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.storage.store import init_file_storage

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Aavin Aalumai database-free persistence and initial seeds...")
    try:
        init_file_storage()
    except Exception as e:
        logger.error(f"Error initializing file storage: {e}")
    yield
    logger.info("Aavin Aalumai backend shutting down gracefully.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-Grade Industrial Milk Production Monitoring & Tamper-Evident Evidence Platform for Aavin Dairy Plants.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development & production reverse-proxy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health checks
@app.get("/api/v1/health", tags=["Health"])
@app.get("/healthz", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timezone": settings.APP_TIMEZONE,
        "system": "tamper_evident_evidence_ledger"
    }

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.machines import router as machines_router
from app.api.v1.heads import router as heads_router
from app.api.v1.readings import router as readings_router
from app.api.v1.resets import router as resets_router
from app.api.v1.anomalies import router as anomalies_router
from app.api.v1.operations import router as operations_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.admin import router as admin_router
from app.api.v1.reports import router as reports_router
from app.api.v1.machine_readings import router as machine_readings_router

# Register Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(machines_router, prefix="/api/v1")
app.include_router(heads_router, prefix="/api/v1")
app.include_router(readings_router, prefix="/api/v1")
app.include_router(resets_router, prefix="/api/v1")
app.include_router(anomalies_router, prefix="/api/v1")
app.include_router(operations_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(machine_readings_router, prefix="/api/v1")
