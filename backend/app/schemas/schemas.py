from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str
    device_id: Optional[str] = None
    device_model: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str
    permissions: List[str]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    employee_code: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Machine & Head Schemas
class HeadResponse(BaseModel):
    id: str
    machine_id: str
    head_code: str
    head_number: int
    qr_identifier: str
    rated_speed_per_hour: int
    genesis_hash: str
    current_hash: str
    is_active: bool
    latest_counter: Optional[int] = 0
    latest_reading_time: Optional[datetime] = None

    class Config:
        from_attributes = True

class MachineResponse(BaseModel):
    id: str
    machine_code: str
    name: str
    machine_type: str
    total_heads: int
    is_active: bool
    heads: List[HeadResponse] = []

    class Config:
        from_attributes = True

class VariantResponse(BaseModel):
    id: str
    code: str
    name: str
    pouch_volume_ml: int
    pouches_per_crate: int
    color_code: str
    is_active: bool

    class Config:
        from_attributes = True

class ShiftResponse(BaseModel):
    id: str
    name: str
    start_time: time
    end_time: time
    is_active: bool

    class Config:
        from_attributes = True

# Reading Schemas
class ReadingSubmitRequest(BaseModel):
    machine_id: str
    head_id: str
    variant_id: str
    count: int
    ocr_value: Optional[int] = None
    confirmed_value: int
    ocr_confidence: float = 1.0
    device_time: datetime
    device_monotonic_ms: int
    device_boot_id: str
    source: str = "photo_ocr"
    photo_base64: str # Base64 encoded JPEG evidence
    capture_device_id: Optional[str] = None
    reset_event_id: Optional[str] = None
    slot_id: Optional[str] = None
    idempotency_key: Optional[str] = None

class ReadingResponse(BaseModel):
    id: str
    machine_id: str
    head_id: str
    variant_id: str
    user_id: str
    count: int
    ocr_value: Optional[int]
    confirmed_value: int
    ocr_confidence: float
    confirmation_mismatch: bool
    production_delta: int
    device_time: datetime
    server_time: datetime
    estimated_capture_time: datetime
    time_verification_status: str
    photo_object_key: str
    photo_sha256: str
    prev_hash: str
    hash: str
    flags: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# Reset Schemas
class ResetRequestCreate(BaseModel):
    head_id: str
    before_counter: int
    after_counter: int
    before_photo_base64: str
    after_photo_base64: str
    reason: str

class ResetApprovalRequest(BaseModel):
    status: str # approved, rejected
    reason: Optional[str] = None

class ResetEventResponse(BaseModel):
    id: str
    head_id: str
    worker_id: str
    supervisor_id: Optional[str]
    before_counter: int
    after_counter: int
    before_photo_key: str
    after_photo_key: str
    reason: str
    approval_status: str
    calculated_production: int
    requested_at: datetime
    approved_at: Optional[datetime]

    class Config:
        from_attributes = True

# Operations Schemas
class WastageCreateRequest(BaseModel):
    machine_id: str
    head_id: Optional[str] = None
    shift_id: str
    variant_id: str
    packet_count: int
    weight_kg: Optional[float] = None
    reason: str
    photo_base64: Optional[str] = None

class WastageResponse(BaseModel):
    id: str
    machine_id: str
    head_id: Optional[str]
    shift_id: str
    variant_id: str
    packet_count: int
    weight_kg: Optional[float]
    reason: str
    verification_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DispatchCreateRequest(BaseModel):
    dispatch_date: date
    shift_id: str
    machine_id: Optional[str] = None
    variant_id: str
    crates_count: int
    pouches_per_crate: int

class MilkBalanceCreateRequest(BaseModel):
    entry_date: date
    shift_id: str
    variant_id: str
    issued_milk_litres: float
    pouch_volume_ml: int
    packet_count: int

class CalibrationAuditCreate(BaseModel):
    machine_id: str
    head_id: str
    shift_id: str
    variant_id: str
    physical_packet_count: int
    counter_delta: int
    audit_start_time: datetime
    audit_end_time: datetime

# Integrity & Anomaly Schemas
class AnomalyResponse(BaseModel):
    id: str
    machine_id: Optional[str]
    head_id: Optional[str]
    reading_id: Optional[str]
    anomaly_type: str
    severity: str
    description: str
    detection_time: datetime
    status: str
    reviewer_id: Optional[str]
    resolution_notes: Optional[str]

    class Config:
        from_attributes = True

class AnomalyReviewRequest(BaseModel):
    status: str # resolved, false_positive, investigating
    resolution_notes: str

class HashChainStatusResponse(BaseModel):
    head_id: str
    head_code: str
    is_valid: bool
    total_checked: int
    genesis_hash: str
    latest_hash: str
    last_verified_at: datetime
    discrepancies: List[Dict[str, Any]] = []

class DashboardSummaryResponse(BaseModel):
    total_machines: int
    active_machines: int
    total_heads: int
    current_shift: str
    expected_readings: int
    completed_readings: int
    missing_readings: int
    total_recorded_production: int
    total_self_reported_wastage: int
    total_verified_wastage: int
    total_good_packets: int
    active_anomalies: int
    critical_anomalies: int
    hash_chain_status: str
    latest_daily_anchor_hash: Optional[str]
