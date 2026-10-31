from datetime import datetime, timezone, date
import uuid
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey, Text, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class WastageEntry(Base):
    __tablename__ = "wastage_entries"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=True)
    shift_id: Mapped[str] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    variant_id: Mapped[str] = mapped_column(String(36), ForeignKey("variants.id"), nullable=False)
    
    packet_count: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=True)
    photo_key: Mapped[str] = mapped_column(String(255), nullable=True)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(30), default="self_reported") # self_reported, verified, rejected
    verified_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    verification_notes: Mapped[str] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class DispatchEntry(Base):
    __tablename__ = "dispatch_entries"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dispatch_date: Mapped[date] = mapped_column(Date, nullable=False)
    shift_id: Mapped[str] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=True)
    variant_id: Mapped[str] = mapped_column(String(36), ForeignKey("variants.id"), nullable=False)
    
    crates_count: Mapped[int] = mapped_column(Integer, nullable=False)
    pouches_per_crate: Mapped[int] = mapped_column(Integer, nullable=False)
    total_pouches: Mapped[int] = mapped_column(Integer, nullable=False)
    
    recorded_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    verified_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class MilkBalanceEntry(Base):
    __tablename__ = "milk_balance_entries"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    shift_id: Mapped[str] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    variant_id: Mapped[str] = mapped_column(String(36), ForeignKey("variants.id"), nullable=False)
    
    issued_milk_litres: Mapped[float] = mapped_column(Float, nullable=False)
    pouch_volume_ml: Mapped[int] = mapped_column(Integer, nullable=False)
    packet_count: Mapped[int] = mapped_column(Integer, nullable=False)
    
    expected_volume_litres: Mapped[float] = mapped_column(Float, nullable=False)
    difference_litres: Mapped[float] = mapped_column(Float, nullable=False)
    loss_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class CalibrationAudit(Base):
    __tablename__ = "calibration_audits"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=False)
    shift_id: Mapped[str] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    variant_id: Mapped[str] = mapped_column(String(36), ForeignKey("variants.id"), nullable=False)
    
    physical_packet_count: Mapped[int] = mapped_column(Integer, nullable=False)
    counter_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    offset: Mapped[int] = mapped_column(Integer, nullable=False) # physical - delta
    offset_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    
    auditor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    audit_start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    audit_end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    evidence_photo_key: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class UnannouncedAudit(Base):
    __tablename__ = "unannounced_audits"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=False)
    shift_id: Mapped[str] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    assigned_auditor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="scheduled") # scheduled, completed, missed
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
