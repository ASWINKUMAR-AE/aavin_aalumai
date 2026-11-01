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
    qr_id: Optional[str] = None
    qr_version: Optional[int] = 1
    qr_status: Optional[str] = "active"
    qr_payload: Optional[str] = None
    heads: List[HeadResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MachineCreate(BaseModel):
    machine_code: str
    name: str
    machine_type: str
    total_heads: int = 2
    qr_id: Optional[str] = None

class MachineUpdate(BaseModel):
    name: Optional[str] = None
    machine_code: Optional[str] = None
    machine_type: Optional[str] = None
    total_heads: Optional[int] = None
    is_active: Optional[bool] = None

class HeadUpdate(BaseModel):
    rated_speed_per_hour: Optional[int] = None
    is_active: Optional[bool] = None
    head_number: Optional[int] = None

class MachineQRResponse(BaseModel):
    machine_id: str
    machine_code: str
    machine_name: str
    machine_type: str
    qr_id: str
    qr_version: int
    qr_status: str
    qr_payload: str
    head_count: int
    image_url: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class QRValidateRequest(BaseModel):
    qr_text: str

class QRValidateResponse(BaseModel):
    valid: bool
    machine_id: Optional[str] = None
    machine_code: Optional[str] = None
    machine_name: Optional[str] = None
    machine_type: Optional[str] = None
    qr_id: Optional[str] = None
    heads: List[HeadResponse] = []
    error: Optional[str] = None

class QRRegenerateRequest(BaseModel):
    reason: str

class QRRegenerateResponse(BaseModel):
    success: bool
    machine_id: str
    qr_id: str
    version: int
    image_url: str
    message: str

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

# Machine Display Evidence & Dual-Head Schemas
class EvidenceUploadResponse(BaseModel):
    evidence_id: str
    evidence_uuid: str
    machine_id: str
    qr_id: Optional[str] = None
    image_sha256: str
    upload_status: str
    file_size: int
    server_received_at: datetime
    image_url: str

class HeadReadingInput(BaseModel):
    head_number: int # 1 for Head A, 2 for Head B
    head_id: Optional[str] = None
    head_label: Optional[str] = None # "HEAD - A", "HEAD - B"
    variant_id: Optional[str] = None
    
    # OCR values
    production_ocr_value: Optional[int] = None
    wastage_ocr_value: Optional[int] = None
    variant_ocr_value: Optional[str] = None
    machine_speed_ocr: Optional[int] = None
    feed_time_ocr: Optional[str] = None
    recipe_no_ocr: Optional[int] = None

    # Worker confirmed values
    production_confirmed_value: int
    wastage_confirmed_value: Optional[int] = 0
    variant_confirmed_value: Optional[str] = None

    ocr_confidence: Optional[float] = 1.0
    correction_status: Optional[str] = "original" # original, corrected
    correction_reason: Optional[str] = None

class MachineDisplayReadingSubmitRequest(BaseModel):
    evidence_id: str
    machine_id: str
    qr_id: Optional[str] = None
    shift_id: Optional[str] = None
    device_id: Optional[str] = None
    device_time: datetime
    device_monotonic_ms: Optional[int] = 0
    device_boot_id: Optional[str] = "unknown_boot"
    idempotency_key: Optional[str] = None
    raw_ocr_response: Optional[Dict[str, Any]] = None
    head_readings: List[HeadReadingInput]

class MachineReadingOCRResponse(BaseModel):
    id: str
    evidence_id: str
    machine_id: str
    head_id: Optional[str]
    head_number: int
    head_label: Optional[str]
    production_ocr_value: Optional[int]
    wastage_ocr_value: Optional[int]
    variant_ocr_value: Optional[str]
    machine_speed_ocr: Optional[int]
    feed_time_ocr: Optional[str]
    recipe_no_ocr: Optional[int]
    production_confirmed_value: int
    wastage_confirmed_value: Optional[int]
    variant_confirmed_value: Optional[str]
    ocr_confidence: float
    correction_status: str
    correction_reason: Optional[str]
    reading_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class MachineDisplayEvidenceResponse(BaseModel):
    id: str
    evidence_uuid: str
    machine_id: str
    machine_code: Optional[str] = None
    machine_name: Optional[str] = None
    qr_id: Optional[str] = None
    shift_id: Optional[str] = None
    worker_id: str
    worker_name: Optional[str] = None
    mime_type: str
    file_size: int
    image_sha256: str
    captured_at: datetime
    server_received_at: datetime
    upload_status: str
    verification_status: str
    image_url: str
    head_readings: List[MachineReadingOCRResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True



# Operational Handover & Interruption Schemas
class ShiftHandoverRequest(BaseModel):
    shift_id: str
    shift_name: str
    outgoing_supervisor_id: Optional[str] = None
    incoming_supervisor_id: Optional[str] = None
    handover_notes: str
    missing_heads_acknowledged: List[str] = []
    active_anomalies_reviewed: bool = True


class ShiftHandoverResponse(BaseModel):
    id: str
    shift_id: str
    shift_name: str
    handover_time: datetime
    outgoing_supervisor: str
    incoming_supervisor: str
    completed_heads_count: int
    missing_heads_count: int
    missing_head_codes: List[str]
    total_shift_production: int
    total_shift_wastage: int
    active_anomalies_count: int
    handover_notes: str
    status: str


class DowntimeLogRequest(BaseModel):
    machine_id: str
    head_id: Optional[str] = None
    interruption_type: str  # film_roll_replacement, seal_failure, no_milk_supply, maintenance
    reason: str
    duration_minutes: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None


class DowntimeLogResponse(BaseModel):
    id: str
    machine_id: str
    machine_code: str
    head_id: Optional[str] = None
    interruption_type: str
    reason: str
    duration_minutes: int
    logged_by: str
    created_at: datetime
