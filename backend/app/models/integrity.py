from datetime import datetime, timezone, date
import uuid
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey, Text, JSON, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Anomaly(Base):
    __tablename__ = "anomalies"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=True)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=True)
    reading_id: Mapped[str] = mapped_column(String(36), ForeignKey("readings.id"), nullable=True)
    
    anomaly_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # negative_delta, unwitnessed_reset, excessive_rate, low_production, late_reading, missed_slot,
    # ocr_mismatch, broken_chain, time_offset, duplicate_photo, milk_balance_drift, calibration_drift
    
    severity: Mapped[str] = mapped_column(String(20), default="High") # Critical, High, Medium, Low, Informational
    description: Mapped[str] = mapped_column(Text, nullable=False)
    detection_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    status: Mapped[str] = mapped_column(String(30), default="active") # active, investigating, resolved, false_positive
    reviewer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_notes: Mapped[str] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    actor_id: Mapped[str] = mapped_column(String(36), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(30), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(50), nullable=False)
    before_state: Mapped[dict] = mapped_column(JSON, nullable=True)
    after_state: Mapped[dict] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class HashAnchor(Base):
    __tablename__ = "hash_anchors"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    plant_id: Mapped[str] = mapped_column(String(50), default="AAVIN_MADURAI_MAIN_DAIRY")
    anchor_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    heads_count: Mapped[int] = mapped_column(Integer, nullable=False)
    manifest_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    signature: Mapped[str] = mapped_column(Text, nullable=False)
    manifest_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    external_storage_uri: Mapped[str] = mapped_column(String(255), nullable=True)
    email_status: Mapped[str] = mapped_column(String(30), default="delivered")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    role_description: Mapped[str] = mapped_column(String(100), nullable=True)
    min_severity: Mapped[str] = mapped_column(String(20), default="High")
    notify_on_broken_chain: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_on_daily_anchor: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    recipient_email: Mapped[str] = mapped_column(String(100), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="sent")
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ChainVerificationRun(Base):
    __tablename__ = "chain_verification_runs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=False)
    total_checked: Mapped[int] = mapped_column(Integer, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    broken_at_reading_id: Mapped[str] = mapped_column(String(36), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ServerTimeAnchor(Base):
    __tablename__ = "server_time_anchors"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    device_id: Mapped[str] = mapped_column(String(100), nullable=False)
    device_boot_identifier: Mapped[str] = mapped_column(String(100), nullable=False)
    monotonic_at_sync: Mapped[int] = mapped_column(Integer, nullable=False)
    server_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False)
    response_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_body: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
