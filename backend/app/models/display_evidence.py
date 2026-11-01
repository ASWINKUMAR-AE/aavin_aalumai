from datetime import datetime, timezone
import uuid
from sqlalchemy import String, Boolean, DateTime, Integer, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class MachineDisplayEvidence(Base):
    __tablename__ = "machine_display_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    evidence_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True, default=generate_uuid)
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    qr_id: Mapped[str] = mapped_column(String(50), nullable=True)
    shift_id: Mapped[str] = mapped_column(String(50), nullable=True)
    worker_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    original_image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(50), default="image/jpeg")
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    server_received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    upload_status: Mapped[str] = mapped_column(String(30), default="uploaded")  # uploaded, verified, failed
    verification_status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, verified, flagged
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    machine: Mapped["Machine"] = relationship("Machine")
    worker: Mapped["User"] = relationship("User")
    ocr_readings: Mapped[list["MachineReadingOCR"]] = relationship(
        "MachineReadingOCR", back_populates="evidence", cascade="all, delete-orphan"
    )

class MachineReadingOCR(Base):
    __tablename__ = "machine_reading_ocr"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    evidence_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("machine_display_evidence.id"), nullable=False, index=True
    )
    machine_id: Mapped[str] = mapped_column(String(36), ForeignKey("machines.id"), nullable=False, index=True)
    head_id: Mapped[str] = mapped_column(String(36), ForeignKey("heads.id"), nullable=True, index=True)
    head_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)  # 1 (Head A) or 2 (Head B)
    head_label: Mapped[str] = mapped_column(String(20), nullable=True)  # "HEAD - A", "HEAD - B"

    # OCR extracted values
    production_ocr_value: Mapped[int] = mapped_column(Integer, nullable=True)
    wastage_ocr_value: Mapped[int] = mapped_column(Integer, nullable=True)
    variant_ocr_value: Mapped[str] = mapped_column(String(50), nullable=True)
    machine_speed_ocr: Mapped[int] = mapped_column(Integer, nullable=True)
    feed_time_ocr: Mapped[str] = mapped_column(String(20), nullable=True)
    recipe_no_ocr: Mapped[int] = mapped_column(Integer, nullable=True)

    # Worker-confirmed values
    production_confirmed_value: Mapped[int] = mapped_column(Integer, nullable=False)
    wastage_confirmed_value: Mapped[int] = mapped_column(Integer, nullable=True)
    variant_confirmed_value: Mapped[str] = mapped_column(String(50), nullable=True)

    # Raw response & metadata
    raw_ocr_response: Mapped[dict] = mapped_column(JSON, nullable=True)
    ocr_confidence: Mapped[float] = mapped_column(Float, default=1.0)
    correction_status: Mapped[str] = mapped_column(String(30), default="original")  # original, corrected
    correction_reason: Mapped[str] = mapped_column(Text, nullable=True)

    # Linked reading in the authoritative ledger
    reading_id: Mapped[str] = mapped_column(String(36), ForeignKey("readings.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    evidence: Mapped["MachineDisplayEvidence"] = relationship("MachineDisplayEvidence", back_populates="ocr_readings")
    machine: Mapped["Machine"] = relationship("Machine")
    head: Mapped["Head"] = relationship("Head")
    reading: Mapped["Reading"] = relationship("Reading")

