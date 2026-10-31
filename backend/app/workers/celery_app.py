import os
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "aavin_ledger_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.APP_TIMEZONE,
    enable_utc=True,
)

@celery_app.task
def verify_all_head_chains_task():
    """Background task to run periodic hash-chain verification across all 14 heads."""
    from app.db.session import SessionLocal
    from app.models.machine import Head
    from app.services.hash_chain_service import HashChainService
    from app.core.logging import logger

    db = SessionLocal()
    try:
        heads = db.query(Head).filter(Head.is_active == True).all()
        for head in heads:
            is_valid, checked, discrepancies = HashChainService.verify_head_chain(db, head.id)
            if not is_valid:
                logger.error(f"Integrity check failed for head {head.head_code}: {discrepancies}")
            else:
                logger.info(f"Verified chain for head {head.head_code}: {checked} readings OK")
    finally:
        db.close()
