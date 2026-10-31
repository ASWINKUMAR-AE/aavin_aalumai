from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Reading(Base):
    __tablename__ = "readings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=False, index=True)
    variant_id: Mapped[str] = mapped_column(String(36), ForeignKey("variants.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    slot_id: Mapped[str] = mapped_column(String(36), ForeignKey("slots.id"), nullable=True)
    
    # Counter values
    count: Mapped[int] = mapped_column(Integer, nullable=False) # Authoritative confirmed count
    ocr_value: Mapped[int] = mapped_column(Integer, nullable=True)
    confirmed_value: Mapped[int] = mapped_column(Integer, nullable=False)
    ocr_confidence: Mapped[float] = mapped_column(Float, default=1.0)
    confirmation_mismatch: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Production calculation
    production_delta: Mapped[int] = mapped_column(Integer, default=0)
    
    # Time anchoring
    device_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    device_monotonic_time: Mapped[int] = mapped_column(Integer, nullable=False) # in milliseconds
    device_boot_identifier: Mapped[str] = mapped_column(String(100), nullable=False)
    server_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    estimated_capture_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    time_verification_status: Mapped[str] = mapped_column(String(30), default="verified") # verified, offset_flagged, unverified_reboot
    
    # Source & Device
    source: Mapped[str] = mapped_column(String(30), default="photo_ocr") # photo_manual, photo_ocr, sensor_future
    capture_device_id: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Evidence & Hashes
    photo_object_key: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    perceptual_hash: Mapped[str] = mapped_column(String(64), nullable=True)
    
    # Cryptographic Hash Chain
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    canonical_version: Mapped[str] = mapped_column(String(10), default="v1")
    
    # Reset & Flags
    reset_event_id: Mapped[str] = mapped_column(String(36), ForeignKey("reset_events.id"), nullable=True)
    flags: Mapped[dict] = mapped_column(JSON, default=dict)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    evidence: Mapped["ReadingEvidence"] = relationship("ReadingEvidence", back_populates="reading", uselist=False)

class ReadingEvidence(Base):
    __tablename__ = "reading_evidence"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    reading_id: Mapped[str] = mapped_column(String(36), ForeignKey("readings.id"), unique=True, nullable=False)
    raw_photo_key: Mapped[str] = mapped_column(String(255), nullable=False)
    raw_photo_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    crop_photo_key: Mapped[str] = mapped_column(String(255), nullable=True)
    crop_photo_sha256: Mapped[str] = mapped_column(String(64), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(50), default="image/jpeg")
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    reading: Mapped["Reading"] = relationship("Reading", back_populates="evidence")

class ResetEvent(Base):
    __tablename__ = "reset_events"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=False)
    worker_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    supervisor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    
    before_counter: Mapped[int] = mapped_column(Integer, nullable=False)
    after_counter: Mapped[int] = mapped_column(Integer, nullable=False)
    before_photo_key: Mapped[str] = mapped_column(String(255), nullable=False)
    after_photo_key: Mapped[str] = mapped_column(String(255), nullable=False)
    
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), default="pending") # pending, approved, rejected
    rejection_reason: Mapped[str] = mapped_column(Text, nullable=True)
    calculated_production: Mapped[int] = mapped_column(Integer, default=0)
    
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

class ReadingCorrection(Base):
    __tablename__ = "reading_corrections"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    original_reading_id: Mapped[str] = mapped_column(String(36), ForeignKey("readings.id"), nullable=False)
    corrected_value: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    requesting_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    authorizing_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
