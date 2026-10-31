# Database Schema Specification

## 1. Core Tables

1. **users**: `id (UUID)`, `email (VARCHAR)`, `full_name`, `hashed_password`, `is_active`, `created_at`
2. **roles**: `id (UUID)`, `name (worker, supervisor, official, admin)`, `description`
3. **permissions**: `id (UUID)`, `name (reading.capture, reset.approve, etc.)`
4. **role_permissions**: `role_id`, `permission_id`
5. **user_roles**: `user_id`, `role_id`
6. **machines**: `id (VARCHAR)`, `name`, `type (RMC, Samarpan, Atomic Engineers)`, `is_active`, `created_at`
7. **heads**: `id (VARCHAR)`, `machine_id`, `head_number (1, 2)`, `qr_identifier`, `rated_max_rate`, `is_active`, `genesis_hash`, `latest_hash`
8. **variants**: `id (UUID)`, `code`, `name (Aavin Nice, Aavin Green, Aavin Gold)`, `pouch_volume_ml`, `pouches_per_crate`
9. **shifts**: `id (UUID)`, `name (Shift 1 - Morning, Shift 2 - Afternoon, Shift 3 - Night)`, `start_time`, `end_time`
10. **readings**: `id (UUID)`, `machine_id`, `head_id`, `count (BIGINT)`, `device_time`, `device_monotonic_time`, `device_boot_identifier`, `server_time`, `estimated_capture_time`, `time_verification_status`, `source`, `variant_id`, `user_id`, `ocr_value`, `confirmed_value`, `ocr_confidence`, `confirmation_mismatch`, `photo_object_key`, `photo_sha256`, `prev_hash`, `hash`, `created_at`
11. **reading_corrections**: `id (UUID)`, `reading_id`, `corrected_value`, `reason`, `requested_by`, `approved_by`, `created_at`
12. **reset_events**: `id (UUID)`, `head_id`, `previous_reading`, `new_reading`, `before_photo_key`, `after_photo_key`, `requested_by`, `supervisor_id`, `supervisor_notes`, `status`, `created_at`
13. **anomalies**: `id (UUID)`, `machine_id`, `head_id`, `reading_id`, `type`, `severity`, `description`, `status`, `detected_at`, `reviewed_by`, `resolution_notes`
14. **hash_anchors**: `id (UUID)`, `anchor_date`, `plant_id`, `head_hashes (JSONB)`, `root_digest`, `signed_manifest`, `delivery_status`, `created_at`
15. **wastage_entries**: `id (UUID)`, `machine_id`, `head_id`, `shift_id`, `variant_id`, `packet_count`, `weight_kg`, `status`, `worker_id`
16. **dispatch_entries**: `id (UUID)`, `date`, `shift_id`, `variant_id`, `crates_count`, `pouches_per_crate`, `total_pouches`, `created_by`
17. **milk_balance_entries**: `id (UUID)`, `date`, `shift_id`, `milk_issued_litres`, `variant_id`, `packet_count`, `pouch_volume_ml`, `expected_volume_litres`, `loss_litres`, `loss_percentage`
18. **calibration_audits**: `id (UUID)`, `machine_id`, `head_id`, `shift_id`, `physical_count`, `counter_delta`, `offset_packets`, `offset_percentage`, `audited_by`, `created_at`
19. **unannounced_audits**: `id (UUID)`, `machine_id`, `head_id`, `scheduled_shift_id`, `scheduled_date`, `assigned_auditor_id`, `status`
20. **audit_logs**: `id (UUID)`, `user_id`, `action`, `resource_type`, `resource_id`, `payload`, `ip_address`, `created_at`
