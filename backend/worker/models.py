import hashlib
import json
import uuid
from django.db import models


class Machine(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=160)
    machine_type = models.CharField(max_length=80)
    qr_id = models.CharField(max_length=32, unique=True)
    qr_version = models.PositiveIntegerField(default=1)
    qr_status = models.CharField(max_length=16, default="active")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class MachineHead(models.Model):
    machine = models.ForeignKey(Machine, related_name="heads", on_delete=models.CASCADE)
    code = models.CharField(max_length=48, unique=True)
    number = models.PositiveSmallIntegerField()
    qr_identifier = models.CharField(max_length=256, unique=True)
    rated_speed_per_hour = models.PositiveIntegerField(default=2500)
    genesis_hash = models.CharField(max_length=64)
    current_hash = models.CharField(max_length=64)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["machine", "number"], name="unique_machine_head_number")]


class CounterReading(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    machine = models.ForeignKey(Machine, on_delete=models.PROTECT)
    head = models.ForeignKey(MachineHead, related_name="readings", on_delete=models.PROTECT)
    variant_id = models.CharField(max_length=32)
    count = models.BigIntegerField()
    ocr_value = models.BigIntegerField(null=True, blank=True)
    confirmed_value = models.BigIntegerField()
    ocr_confidence = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)
    confirmation_mismatch = models.BooleanField(default=False)
    mismatch_reason = models.TextField(blank=True)
    source = models.CharField(max_length=32, default="photo_ocr")
    device_time = models.DateTimeField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=128, unique=True)
    production_delta = models.BigIntegerField(default=0)
    prev_hash = models.CharField(max_length=64)
    hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def digest(previous_hash, payload):
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        return hashlib.sha256(f"{previous_hash}:{canonical}".encode()).hexdigest()


class ResetRequest(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")]
    head = models.ForeignKey(MachineHead, on_delete=models.PROTECT)
    before_counter = models.BigIntegerField()
    after_counter = models.BigIntegerField()
    reason = models.TextField()
    before_photo_base64 = models.TextField(blank=True)
    after_photo_base64 = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)


class WastageEntry(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.PROTECT)
    head = models.ForeignKey(MachineHead, on_delete=models.PROTECT)
    shift_id = models.CharField(max_length=64)
    variant_id = models.CharField(max_length=32)
    packet_count = models.PositiveIntegerField()
    weight_kg = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    reason = models.TextField()
    photo_base64 = models.TextField(blank=True)
    status = models.CharField(max_length=32, default="self_reported")
    created_at = models.DateTimeField(auto_now_add=True)
