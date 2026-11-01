from django.db import transaction
from django.db.models import Prefetch
from django.http import Http404
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import CounterReading, Machine, MachineHead, ResetRequest, WastageEntry


def machine_or_404(value):
    try:
        return Machine.objects.get(code=value)
    except Machine.DoesNotExist:
        try:
            return Machine.objects.get(pk=value)
        except (Machine.DoesNotExist, ValueError):
            raise Http404("Machine not found")


def head_or_404(value):
    try:
        return MachineHead.objects.get(code=value)
    except MachineHead.DoesNotExist:
        try:
            return MachineHead.objects.get(pk=value)
        except (MachineHead.DoesNotExist, ValueError):
            raise Http404("Machine head not found")


def head_payload(head):
    latest = head.readings.order_by("-created_at").first()
    return {"id": head.code, "machine_id": head.machine.code, "head_code": head.code,
            "head_number": head.number, "qr_identifier": head.qr_identifier,
            "rated_speed_per_hour": head.rated_speed_per_hour, "genesis_hash": head.genesis_hash,
            "current_hash": head.current_hash, "is_active": head.is_active,
            "latest_counter": latest.count if latest else 0,
            "latest_reading_time": latest.created_at.isoformat() if latest else None}


def machine_payload(machine):
    return {"id": machine.code, "machine_code": machine.code, "name": machine.name,
            "machine_type": machine.machine_type, "total_heads": machine.heads.count(),
            "qr_id": machine.qr_id, "qr_version": machine.qr_version, "qr_status": machine.qr_status,
            "heads": [head_payload(head) for head in machine.heads.all().order_by("number")]}


@api_view(["GET"])
def health(request):
    return Response({"status": "healthy", "app": "Aavin Aalumai Django API"})


@api_view(["GET", "PUT"])
def machine_detail(request, machine_id):
    machine = machine_or_404(machine_id)
    if request.method == "PUT":
        for field in ("name", "machine_type"):
            if field in request.data and str(request.data[field]).strip():
                setattr(machine, field, str(request.data[field]).strip())
        machine.save()
    return Response(machine_payload(machine))


@api_view(["POST"])
def validate_qr(request):
    raw = str(request.data.get("qr_text", ""))
    machine = Machine.objects.filter(qr_id__in=[raw, raw.upper()], is_active=True).first()
    if not machine:
        machine = next((m for m in Machine.objects.filter(is_active=True) if m.qr_id in raw or m.code in raw), None)
    if not machine:
        return Response({"valid": False, "error": "Unregistered QR code"}, status=status.HTTP_404_NOT_FOUND)
    return Response({"valid": True, "machine_id": machine.code, "machine_code": machine.code,
                     "machine_name": machine.name, "machine_type": machine.machine_type, "qr_id": machine.qr_id})


def create_reading(request):
    data = request.data
    required = ["machine_id", "head_id", "variant_id", "count", "idempotency_key"]
    missing = [key for key in required if data.get(key) in (None, "")]
    if missing:
        return Response({"detail": f"Missing fields: {', '.join(missing)}"}, status=400)
    existing = CounterReading.objects.filter(idempotency_key=data["idempotency_key"]).first()
    if existing:
        return Response(reading_payload(existing))
    with transaction.atomic():
        machine = machine_or_404(str(data["machine_id"]))
        head = MachineHead.objects.select_for_update().get(code=str(data["head_id"]), machine=machine)
        latest = head.readings.order_by("-created_at").first()
        count = int(data["count"])
        delta = count - latest.count if latest else count
        payload = {"machine": machine.code, "head": head.code, "count": count, "variant": data["variant_id"], "idempotency": data["idempotency_key"]}
        previous_hash = head.current_hash
        digest = CounterReading.digest(previous_hash, payload)
        reading = CounterReading.objects.create(
            machine=machine, head=head, variant_id=data["variant_id"], count=count,
            ocr_value=data.get("ocr_value"), confirmed_value=data.get("confirmed_value", count),
            ocr_confidence=data.get("ocr_confidence"), confirmation_mismatch=data.get("confirmation_mismatch", False),
            mismatch_reason=data.get("mismatch_reason", ""), source=data.get("source", "photo_ocr"),
            device_time=parse_datetime(data["device_time"]) if data.get("device_time") else None,
            idempotency_key=data["idempotency_key"], production_delta=delta, prev_hash=previous_hash, hash=digest)
        head.current_hash = digest
        head.save(update_fields=["current_hash"])
    return Response(reading_payload(reading), status=status.HTTP_201_CREATED)


def reading_payload(reading):
    return {"id": str(reading.id), "machine_id": reading.machine.code, "head_id": reading.head.code,
            "variant_id": reading.variant_id, "count": reading.count, "production_delta": reading.production_delta,
            "delta": reading.production_delta, "hash": reading.hash, "prev_hash": reading.prev_hash,
            "created_at": reading.created_at.isoformat()}


@api_view(["GET", "POST"])
def readings(request):
    if request.method == "POST":
        return create_reading(request)
    limit = min(int(request.GET.get("limit", 20)), 100)
    return Response([reading_payload(item) for item in CounterReading.objects.select_related("machine", "head").order_by("-created_at")[:limit]])


@api_view(["POST"])
def create_reset(request):
    data = request.data
    try:
        head = head_or_404(str(data["head_id"]))
        reset = ResetRequest.objects.create(head=head, before_counter=int(data["before_counter"]), after_counter=int(data["after_counter"]),
                                            reason=data["reason"], before_photo_base64=data.get("before_photo_base64", ""), after_photo_base64=data.get("after_photo_base64", ""))
    except KeyError as exc:
        return Response({"detail": f"Missing field: {exc.args[0]}"}, status=400)
    return Response({"id": reset.id, "status": reset.status}, status=201)


@api_view(["POST"])
def create_wastage(request):
    data = request.data
    try:
        machine = machine_or_404(str(data["machine_id"]))
        head = head_or_404(str(data["head_id"]))
        if head.machine_id != machine.id:
            return Response({"detail": "Head does not belong to machine"}, status=400)
        entry = WastageEntry.objects.create(machine=machine, head=head, shift_id=data["shift_id"], variant_id=data["variant_id"],
                                            packet_count=int(data["packet_count"]), weight_kg=data.get("weight_kg"), reason=data["reason"], photo_base64=data.get("photo_base64", ""))
    except KeyError as exc:
        return Response({"detail": f"Missing field: {exc.args[0]}"}, status=400)
    return Response({"id": entry.id, "status": entry.status}, status=201)
