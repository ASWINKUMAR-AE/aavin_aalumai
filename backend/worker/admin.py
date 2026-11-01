from django.contrib import admin
from .models import CounterReading, Machine, MachineHead, ResetRequest, WastageEntry

admin.site.register([Machine, MachineHead, CounterReading, ResetRequest, WastageEntry])
