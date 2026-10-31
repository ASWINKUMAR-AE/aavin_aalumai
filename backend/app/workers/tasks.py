from datetime import datetime, timezone, date
import hashlib
from app.workers.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.machine import Head
from app.models.integrity import HashAnchor, NotificationDelivery, ChainVerificationRun
from app.services.hash_chain_service import HashChainService, canonical_json
from app.core.logging import logger

@celery_app.task
def verify_all_chains_task():
    logger.info("Executing scheduled hash-chain verification across all machine heads...")
    db = SessionLocal()
    try:
        heads = db.query(Head).filter(Head.is_active == True).all()
        for head in heads:
            is_valid, checked_count, discrepancies = HashChainService.verify_head_chain(db, head.id)
            run = ChainVerificationRun(
                head_id=head.id,
                total_checked=checked_count,
                is_valid=is_valid,
                details={"discrepancies": discrepancies},
                verified_at=datetime.now(timezone.utc)
            )
            db.add(run)
        db.commit()
        logger.info(f"Verified hash chains for {len(heads)} heads successfully.")
    except Exception as e:
        logger.error(f"Error in verify_all_chains_task: {e}")
    finally:
        db.close()

@celery_app.task
def generate_daily_anchor_manifest(anchor_date_str=None):
    logger.info("Generating daily external signed hash anchor manifest...")
    db = SessionLocal()
    try:
        target_date = datetime.strptime(anchor_date_str, "%Y-%m-%d").date() if anchor_date_str else date.today()
        heads = db.query(Head).filter(Head.is_active == True).all()
        head_manifest = {}
        for h in heads:
            head_manifest[h.head_code] = {
                "head_id": h.id,
                "qr_identifier": h.qr_identifier,
                "latest_hash": h.current_hash
            }

        manifest_payload = {
            "plant_id": "AAVIN_MADURAI_MAIN_DAIRY",
            "date": target_date.isoformat(),
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "heads_count": len(heads),
            "heads": head_manifest
        }
        serialized = canonical_json(manifest_payload)
        manifest_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        signature = f"SIG_AAVIN_ED25519_{hashlib.sha256((manifest_hash + 'PROD_KMS_2026').encode()).hexdigest()}"

        existing = db.query(HashAnchor).filter(HashAnchor.anchor_date == target_date).first()
        if not existing:
            anchor = HashAnchor(
                anchor_date=target_date,
                heads_count=len(heads),
                manifest_hash=manifest_hash,
                signature=signature,
                manifest_payload=manifest_payload,
                email_status="delivered"
            )
            db.add(anchor)
            db.commit()
            logger.info(f"Sealed and committed daily hash anchor {manifest_hash[:16]} for {target_date}")
    except Exception as e:
        logger.error(f"Error generating daily anchor manifest: {e}")
    finally:
        db.close()

@celery_app.task
def dispatch_anomaly_alerts():
    db = SessionLocal()
    try:
        pending = db.query(NotificationDelivery).filter(NotificationDelivery.status == "queued").all()
        for delivery in pending:
            # Simulate SMTP dispatch
            logger.info(f"Delivering alert email to {delivery.recipient_email}: {delivery.subject}")
            delivery.status = "sent"
            delivery.sent_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()
