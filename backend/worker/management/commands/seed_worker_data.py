from django.core.management.base import BaseCommand
from worker.models import Machine, MachineHead
import hashlib

MACHINES = [
    ("RMC-01", "RMC VFFS Machine 1", "RMC", "QR-001", "TM-500"),
    ("RMC-02", "RMC VFFS Machine 2", "RMC", "QR-002", "SM-500"),
    ("SMP-01", "Samarpan Integrus 1", "Samarpan", "QR-003", "FCM-500"),
    ("SMP-02", "Samarpan Integrus 2", "Samarpan", "QR-004", "TM-500"),
    ("SMP-03", "Samarpan Integrus 3", "Samarpan", "QR-005", "DTM-500"),
    ("ATM-01", "Atomic Engineers 1", "Atomic Engineers", "QR-006", "SM-500"),
]

class Command(BaseCommand):
    help = "Seeds the six worker packaging machines and their twelve heads."

    def handle(self, *args, **options):
        for code, name, machine_type, qr_id, _variant in MACHINES:
            machine, _ = Machine.objects.update_or_create(code=code, defaults={"name": name, "machine_type": machine_type, "qr_id": qr_id})
            for number in (1, 2):
                head_code = f"{code}-H{number}"
                genesis = hashlib.sha256(f"AAVIN:{head_code}:GENESIS".encode()).hexdigest()
                MachineHead.objects.get_or_create(machine=machine, number=number, defaults={"code": head_code, "qr_identifier": f"AAVIN://MADURAI/DAIRY/{code}/HEAD_{number}", "genesis_hash": genesis, "current_hash": genesis})
        self.stdout.write(self.style.SUCCESS("Seeded 6 machines and 12 heads."))
