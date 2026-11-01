from django.urls import path
from . import views

urlpatterns = [
    path("health", views.health),
    path("machines/qr/validate", views.validate_qr),
    path("machines/<str:machine_id>", views.machine_detail),
    path("readings", views.readings),
    path("resets", views.create_reset),
    path("operations/wastage", views.create_wastage),
]
