from datetime import datetime, timezone, time
import uuid
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey, Time, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Machine(Base):
    __tablename__ = "machines"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    machine_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    machine_type: Mapped[str] = mapped_column(String(50), nullable=False) # RMC, Samarpan, Atomic Engineers
    total_heads: Mapped[int] = mapped_column(Integer, default=2)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    heads: Mapped[list["Head"]] = relationship("Head", back_populates="machine", cascade="all, delete-orphan")

class Head(Base):
    __tablename__ = "heads"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False)
    head_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    head_number: Mapped[int] = mapped_column(Integer, nullable=False) # 1 or 2
    qr_identifier: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    rated_speed_per_hour: Mapped[int] = mapped_column(Integer, default=2500)
    genesis_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    current_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    machine: Mapped["Machine"] = relationship("Machine", back_populates="heads")
    thresholds: Mapped["HeadThreshold"] = relationship("HeadThreshold", back_populates="head", uselist=False)

class Variant(Base):
    __tablename__ = "variants"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    fat_percentage: Mapped[float] = mapped_column(Float, default=3.0)
    snf_percentage: Mapped[float] = mapped_column(Float, default=8.5)
    pouch_volume_ml: Mapped[int] = mapped_column(Integer, default=500)
    pouches_per_crate: Mapped[int] = mapped_column(Integer, default=20)
    color_code: Mapped[str] = mapped_column(String(20), default="#0A73C0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Shift(Base):
    __tablename__ = "shifts"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False) # Shift 1 (Morning), Shift 2 (Evening), Shift 3 (Night)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Slot(Base):
    __tablename__ = "slots"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    shift_id: Mapped[str] = mapped_column(String(36), ForeignKey("shifts.id"), nullable=False)
    slot_name: Mapped[str] = mapped_column(String(50), nullable=False) # Shift Boundary, Mid Shift Check
    expected_time: Mapped[time] = mapped_column(Time, nullable=False)
    grace_minutes: Mapped[int] = mapped_column(Integer, default=15)

class HeadThreshold(Base):
    __tablename__ = "head_thresholds"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), unique=True, nullable=False)
    max_rate_per_hour: Mapped[int] = mapped_column(Integer, default=3000)
    min_shift_expected: Mapped[int] = mapped_column(Integer, default=500)
    late_minutes_flag: Mapped[int] = mapped_column(Integer, default=20)
    time_offset_flag_seconds: Mapped[int] = mapped_column(Integer, default=300)
    
    head: Mapped["Head"] = relationship("Head", back_populates="thresholds")

class UserMachineAssignment(Base):
    __tablename__ = "user_machine_assignments"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
