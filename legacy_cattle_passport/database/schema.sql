-- ==========================================================
-- AAVIN SMART CATTLE PASSPORT - MILK SAFETY TWIN
-- Database Schema: aavin_milkflow
-- Storage Engine: InnoDB | Character Set: utf8mb4
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `aavin_milkflow` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `aavin_milkflow`;

-- 1. Users table
CREATE TABLE `users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `email` VARCHAR(120) NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `status` ENUM('active', 'pending_approval', 'suspended', 'inactive') NOT NULL DEFAULT 'active',
  `preferred_language` ENUM('en', 'ta') NOT NULL DEFAULT 'en',
  `avatar_url` VARCHAR(255) NULL,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_phone` (`phone`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Roles
CREATE TABLE `roles` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Permissions
CREATE TABLE `permissions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL UNIQUE,
  `category` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Role Permissions
CREATE TABLE `role_permissions` (
  `role_id` VARCHAR(36) NOT NULL,
  `permission_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. User Roles (many-to-many, role-based access)
CREATE TABLE `user_roles` (
  `user_id` VARCHAR(36) NOT NULL,
  `role_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Collection Centres (Madurai District Ecosystem)
CREATE TABLE `collection_centres` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `centre_code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(120) NOT NULL,
  `taluk` VARCHAR(80) NOT NULL DEFAULT 'Madurai',
  `village` VARCHAR(100) NOT NULL,
  `district` VARCHAR(80) NOT NULL DEFAULT 'Madurai',
  `contact_person` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `capacity_litres_per_day` DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Farmer Profiles
CREATE TABLE `farmer_profiles` (
  `user_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `farmer_id_code` VARCHAR(30) NOT NULL UNIQUE,
  `village` VARCHAR(100) NOT NULL,
  `taluk` VARCHAR(80) NOT NULL DEFAULT 'Madurai',
  `bank_account_name` VARCHAR(100) NULL,
  `bank_name` VARCHAR(100) NULL,
  `bank_account_number` VARCHAR(50) NULL,
  `bank_ifsc` VARCHAR(20) NULL,
  `upi_id` VARCHAR(50) NULL,
  `primary_centre_id` VARCHAR(36) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`primary_centre_id`) REFERENCES `collection_centres` (`id`) ON DELETE SET NULL,
  INDEX `idx_farmer_code` (`farmer_id_code`),
  INDEX `idx_farmer_village` (`village`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Veterinary Profiles
CREATE TABLE `veterinary_profiles` (
  `user_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `vet_license_number` VARCHAR(50) NOT NULL UNIQUE,
  `specialization` VARCHAR(100) NOT NULL DEFAULT 'Bovine Medicine & Surgery',
  `assigned_zone` VARCHAR(100) NOT NULL DEFAULT 'Madurai North & Melur',
  `hospital_dispensary_name` VARCHAR(150) NOT NULL DEFAULT 'Aavin Veterinary Dispensary, Madurai',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Centre Farmer Assignments
CREATE TABLE `centre_farmer_assignments` (
  `centre_id` VARCHAR(36) NOT NULL,
  `farmer_user_id` VARCHAR(36) NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`centre_id`, `farmer_user_id`),
  FOREIGN KEY (`centre_id`) REFERENCES `collection_centres` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Cows (Digital Cattle Passport Core Entity)
CREATE TABLE `cows` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tag_number` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `breed` VARCHAR(80) NOT NULL DEFAULT 'Jersey Cross',
  `gender` ENUM('female', 'male') NOT NULL DEFAULT 'female',
  `date_of_birth` DATE NULL,
  `approximate_age_months` INT NULL,
  `current_owner_user_id` VARCHAR(36) NOT NULL,
  `primary_centre_id` VARCHAR(36) NULL,
  `health_status` ENUM('healthy', 'under_treatment', 'quarantine', 'critical', 'retired') NOT NULL DEFAULT 'healthy',
  `lactation_stage` ENUM('early', 'peak', 'mid', 'late', 'dry', 'heifer') NOT NULL DEFAULT 'peak',
  `milking_status` ENUM('lactating', 'dry', 'pregnant', 'quarantine_hold') NOT NULL DEFAULT 'lactating',
  `average_daily_yield` DECIMAL(5,2) NOT NULL DEFAULT 12.50,
  `photo_url` VARCHAR(255) NULL,
  `identification_marks` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`current_owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`primary_centre_id`) REFERENCES `collection_centres` (`id`) ON DELETE SET NULL,
  INDEX `idx_cows_owner` (`current_owner_user_id`),
  INDEX `idx_cows_tag` (`tag_number`),
  INDEX `idx_cows_health` (`health_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Cow QR Tokens (Opaque secure lookup tokens - NEVER personal/medical data in QR)
CREATE TABLE `cow_qr_tokens` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  INDEX `idx_qr_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Cow Owner History (Ownership Transfer Audit Trail)
CREATE TABLE `cow_owner_history` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `previous_owner_user_id` VARCHAR(36) NULL,
  `new_owner_user_id` VARCHAR(36) NOT NULL,
  `transfer_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `transfer_reason` VARCHAR(255) NULL,
  `transferred_by_user_id` VARCHAR(36) NOT NULL,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`previous_owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`new_owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`transferred_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Cow Veterinarian Assignments
CREATE TABLE `cow_veterinarian_assignments` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `vet_user_id` VARCHAR(36) NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` VARCHAR(255) NULL,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vet_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_cow_vet` (`cow_id`, `vet_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Cow Health Records (Clinical Examinations)
CREATE TABLE `cow_health_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `recorded_by_vet_user_id` VARCHAR(36) NOT NULL,
  `examination_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `body_temperature_c` DECIMAL(4,1) NULL,
  `heart_rate_bpm` INT NULL,
  `rumen_motility` VARCHAR(50) NULL,
  `body_condition_score` DECIMAL(3,1) NULL,
  `clinical_signs` TEXT NULL,
  `diagnosis` VARCHAR(255) NULL,
  `health_status_assigned` ENUM('healthy', 'under_treatment', 'quarantine', 'critical') NOT NULL,
  `recommendations` TEXT NULL,
  `next_follow_up_date` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recorded_by_vet_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_health_cow` (`cow_id`, `examination_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Medicine Catalog (Regulatory Approved Veterinary Medicines)
CREATE TABLE `medicine_catalog` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `brand_name` VARCHAR(120) NOT NULL,
  `generic_name` VARCHAR(150) NOT NULL,
  `category` ENUM('antibiotic', 'anti_inflammatory', 'anthelmintic', 'hormone', 'vitamin_mineral', 'vaccine', 'other') NOT NULL,
  `default_milk_withdrawal_days` INT NOT NULL DEFAULT 3,
  `default_meat_withdrawal_days` INT NOT NULL DEFAULT 7,
  `unit_of_measure` VARCHAR(30) NOT NULL DEFAULT 'ml',
  `manufacturer` VARCHAR(120) NULL,
  `warning_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Vaccination Records
CREATE TABLE `vaccination_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `administered_by_vet_user_id` VARCHAR(36) NOT NULL,
  `vaccine_name` VARCHAR(120) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `dose` VARCHAR(30) NOT NULL,
  `administration_date` DATE NOT NULL,
  `next_booster_due_date` DATE NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`administered_by_vet_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Treatment Records (Vet Authored Clinical Treatments)
CREATE TABLE `treatment_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `vet_user_id` VARCHAR(36) NOT NULL,
  `medicine_id` VARCHAR(36) NULL,
  `custom_medicine_name` VARCHAR(150) NULL,
  `dosage` VARCHAR(60) NOT NULL,
  `route_of_administration` ENUM('intramuscular', 'intravenous', 'subcutaneous', 'intramammary', 'oral', 'topical') NOT NULL DEFAULT 'intramuscular',
  `treatment_start_date` DATETIME NOT NULL,
  `treatment_end_date` DATETIME NOT NULL,
  `withdrawal_period_days` INT NOT NULL,
  `milk_withholding_end_time` DATETIME NOT NULL,
  `meat_withholding_end_time` DATETIME NULL,
  `reason_for_treatment` VARCHAR(255) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vet_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicine_catalog` (`id`) ON DELETE SET NULL,
  INDEX `idx_treatment_cow` (`cow_id`),
  INDEX `idx_withholding_end` (`milk_withholding_end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Withdrawal Restrictions (Active / Historical Withdrawal Enforcement Ledger)
CREATE TABLE `withdrawal_restrictions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `treatment_id` VARCHAR(36) NOT NULL,
  `cow_id` VARCHAR(36) NOT NULL,
  `restriction_start` DATETIME NOT NULL,
  `restriction_end` DATETIME NOT NULL,
  `status` ENUM('active', 'cleared', 'extended', 'voided') NOT NULL DEFAULT 'active',
  `reason` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`treatment_id`) REFERENCES `treatment_records` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  INDEX `idx_withdrawal_lookup` (`cow_id`, `status`, `restriction_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Feed Types
CREATE TABLE `feed_types` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `category` ENUM('green_fodder', 'dry_fodder', 'concentrate', 'silage', 'mineral_mixture', 'supplements') NOT NULL,
  `nutritional_notes` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Feeding Records
CREATE TABLE `feeding_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `farmer_user_id` VARCHAR(36) NOT NULL,
  `feed_type_id` VARCHAR(36) NOT NULL,
  `quantity_kg` DECIMAL(6,2) NOT NULL,
  `feeding_time` ENUM('morning', 'afternoon', 'evening', 'night') NOT NULL,
  `feeding_date` DATE NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`feed_type_id`) REFERENCES `feed_types` (`id`) ON DELETE RESTRICT,
  INDEX `idx_feeding_cow_date` (`cow_id`, `feeding_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Milk Production Records (Farm Milking Entries by Farmer)
CREATE TABLE `milk_production_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `farmer_user_id` VARCHAR(36) NOT NULL,
  `session` ENUM('morning', 'evening') NOT NULL,
  `production_date` DATE NOT NULL,
  `quantity_litres` DECIMAL(5,2) NOT NULL,
  `milking_time` TIME NOT NULL,
  `cow_condition_notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `uk_cow_production_session` (`cow_id`, `production_date`, `session`),
  INDEX `idx_production_date` (`production_date`, `farmer_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Collection Sessions
CREATE TABLE `collection_sessions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `centre_id` VARCHAR(36) NOT NULL,
  `session_date` DATE NOT NULL,
  `session_type` ENUM('morning', 'evening') NOT NULL,
  `opened_by_user_id` VARCHAR(36) NOT NULL,
  `closed_by_user_id` VARCHAR(36) NULL,
  `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` DATETIME NULL,
  `total_litres_collected` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_farmers_attended` INT NOT NULL DEFAULT 0,
  `status` ENUM('open', 'closed', 'locked') NOT NULL DEFAULT 'open',
  FOREIGN KEY (`centre_id`) REFERENCES `collection_centres` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`opened_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  UNIQUE KEY `uk_centre_session` (`centre_id`, `session_date`, `session_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Milk Collection Records (At Collection Centre)
CREATE TABLE `milk_collection_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
  `collection_session_id` VARCHAR(36) NOT NULL,
  `centre_id` VARCHAR(36) NOT NULL,
  `farmer_user_id` VARCHAR(36) NOT NULL,
  `cow_id` VARCHAR(36) NOT NULL,
  `operator_user_id` VARCHAR(36) NOT NULL,
  `quantity_litres` DECIMAL(6,2) NOT NULL,
  `temperature_c` DECIMAL(4,1) NOT NULL,
  `collection_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `equipment_device_id` VARCHAR(60) NOT NULL DEFAULT 'ECO-MILK-ANALYZER-MDU-01',
  `sample_can_number` VARCHAR(30) NULL,
  `calculated_amount_inr` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `rate_per_litre_applied` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('unprocessed', 'calculated', 'approved', 'paid') NOT NULL DEFAULT 'unprocessed',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`collection_session_id`) REFERENCES `collection_sessions` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`centre_id`) REFERENCES `collection_centres` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`operator_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_receipt_num` (`receipt_number`),
  INDEX `idx_coll_farmer` (`farmer_user_id`, `collection_time`),
  INDEX `idx_coll_cow` (`cow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Quality Threshold Versions (Deterministic Policy Source)
CREATE TABLE `quality_threshold_versions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `version_code` VARCHAR(30) NOT NULL UNIQUE,
  `title` VARCHAR(100) NOT NULL,
  `min_fat_percent` DECIMAL(4,2) NOT NULL DEFAULT 3.50,
  `min_snf_percent` DECIMAL(4,2) NOT NULL DEFAULT 8.50,
  `min_density_g_cm3` DECIMAL(5,4) NOT NULL DEFAULT 1.0260,
  `max_density_g_cm3` DECIMAL(5,4) NOT NULL DEFAULT 1.0320,
  `max_temperature_c` DECIMAL(4,1) NOT NULL DEFAULT 10.0,
  `fat_review_min` DECIMAL(4,2) NOT NULL DEFAULT 3.00,
  `fat_review_max` DECIMAL(4,2) NOT NULL DEFAULT 3.49,
  `snf_review_min` DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  `snf_review_max` DECIMAL(4,2) NOT NULL DEFAULT 8.49,
  `effective_from` DATETIME NOT NULL,
  `effective_to` DATETIME NULL,
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Milk Quality Tests (Analyzer Readings)
CREATE TABLE `milk_quality_tests` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `collection_record_id` VARCHAR(36) NOT NULL,
  `analyzer_device_id` VARCHAR(60) NOT NULL,
  `analyzer_model` VARCHAR(100) NOT NULL DEFAULT 'MilkoScan / Ekomilk Ultra',
  `fat_percentage` DECIMAL(4,2) NOT NULL,
  `snf_percentage` DECIMAL(4,2) NOT NULL,
  `density_g_cm3` DECIMAL(5,4) NULL,
  `acidity_ph` DECIMAL(3,2) NULL,
  `adulteration_screened` TINYINT(1) NOT NULL DEFAULT 1,
  `adulteration_detected` TINYINT(1) NOT NULL DEFAULT 0,
  `adulteration_types_tested` VARCHAR(255) NULL DEFAULT 'urea,starch,detergent,sugar,salt',
  `test_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `threshold_version_id` VARCHAR(36) NULL,
  `is_demo_data` TINYINT(1) NOT NULL DEFAULT 0,
  `operator_notes` VARCHAR(255) NULL,
  FOREIGN KEY (`collection_record_id`) REFERENCES `milk_collection_records` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`threshold_version_id`) REFERENCES `quality_threshold_versions` (`id`) ON DELETE SET NULL,
  INDEX `idx_test_coll` (`collection_record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Safety Rule Versions
CREATE TABLE `safety_rule_versions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `rule_version_name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NOT NULL,
  `mandatory_tests` JSON NOT NULL,
  `effective_from` DATETIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Milk Safety Decisions (Deterministic Milk Safety Twin Core Engine Output)
CREATE TABLE `milk_safety_decisions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `collection_record_id` VARCHAR(36) NOT NULL UNIQUE,
  `decision` ENUM('CLEAR', 'REVIEW', 'HOLD') NOT NULL,
  `primary_reason` VARCHAR(255) NOT NULL,
  `decision_details` JSON NOT NULL,
  `withdrawal_status` ENUM('none', 'active_hold', 'expired_clear') NOT NULL,
  `withdrawal_end_time` DATETIME NULL,
  `rule_version_id` VARCHAR(36) NULL,
  `evaluated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `override_status` ENUM('none', 'requested', 'approved', 'rejected') NOT NULL DEFAULT 'none',
  `override_by_user_id` VARCHAR(36) NULL,
  `override_reason` TEXT NULL,
  `override_at` DATETIME NULL,
  FOREIGN KEY (`collection_record_id`) REFERENCES `milk_collection_records` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`rule_version_id`) REFERENCES `safety_rule_versions` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`override_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_safety_decision` (`decision`),
  INDEX `idx_safety_eval_time` (`evaluated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Milk Batches (Aggregation for Transportation)
CREATE TABLE `milk_batches` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `batch_number` VARCHAR(50) NOT NULL UNIQUE,
  `centre_id` VARCHAR(36) NOT NULL,
  `total_litres` DECIMAL(10,2) NOT NULL,
  `avg_fat_percent` DECIMAL(4,2) NOT NULL,
  `avg_snf_percent` DECIMAL(4,2) NOT NULL,
  `batch_safety_status` ENUM('CLEAR', 'REVIEW', 'HOLD') NOT NULL DEFAULT 'CLEAR',
  `can_count` INT NOT NULL DEFAULT 10,
  `storage_tanker_number` VARCHAR(50) NULL,
  `status` ENUM('assembled', 'dispatched', 'in_transit', 'delivered', 'accepted_at_dairy', 'rejected_at_dairy') NOT NULL DEFAULT 'assembled',
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`centre_id`) REFERENCES `collection_centres` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_batch_num` (`batch_number`),
  INDEX `idx_batch_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. Vendor Profiles (Milk Transport / Logistics Operators)
CREATE TABLE `vendor_profiles` (
  `user_id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `vendor_code` VARCHAR(30) NOT NULL UNIQUE,
  `vehicle_registration_number` VARCHAR(50) NOT NULL,
  `vehicle_type` VARCHAR(50) NOT NULL DEFAULT 'Insulated Milk Tanker (3000L)',
  `driver_license_number` VARCHAR(50) NULL,
  `route_name` VARCHAR(150) NOT NULL DEFAULT 'Madurai East - Usilampatti Route',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. Vendor Assignments
CREATE TABLE `vendor_assignments` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `vendor_user_id` VARCHAR(36) NOT NULL,
  `centre_id` VARCHAR(36) NOT NULL,
  `destination_plant` VARCHAR(120) NOT NULL DEFAULT 'Aavin Madurai Main Dairy Plant, Sathamangalam',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`centre_id`) REFERENCES `collection_centres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 31. Batch Movements (Custody Tracking and Dispatch/Delivery Events)
CREATE TABLE `batch_movements` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `batch_id` VARCHAR(36) NOT NULL,
  `vendor_user_id` VARCHAR(36) NOT NULL,
  `event_type` ENUM('pickup_scanned', 'dispatched', 'transit_temp_check', 'delivered', 'discrepancy_reported', 'dairy_accepted') NOT NULL,
  `litres_recorded` DECIMAL(10,2) NOT NULL,
  `temperature_c` DECIMAL(4,1) NULL,
  `location_latitude` DECIMAL(10,8) NULL,
  `location_longitude` DECIMAL(11,8) NULL,
  `discrepancy_litres` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  `discrepancy_reason` VARCHAR(255) NULL,
  `remarks` TEXT NULL,
  `event_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`batch_id`) REFERENCES `milk_batches` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`vendor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_movement_batch` (`batch_id`, `event_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 32. Milk Pricing Rules (Deterministic Transparent Rates)
CREATE TABLE `milk_pricing_rules` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `rule_code` VARCHAR(40) NOT NULL UNIQUE,
  `title` VARCHAR(120) NOT NULL,
  `base_rate_per_litre` DECIMAL(6,2) NOT NULL DEFAULT 36.00,
  `standard_fat_percent` DECIMAL(4,2) NOT NULL DEFAULT 4.00,
  `standard_snf_percent` DECIMAL(4,2) NOT NULL DEFAULT 8.50,
  `fat_increment_per_point` DECIMAL(5,2) NOT NULL DEFAULT 0.30,
  `snf_increment_per_point` DECIMAL(5,2) NOT NULL DEFAULT 0.20,
  `quality_incentive_flat` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` VARCHAR(255) NULL DEFAULT 'SAMPLE DATA - Configurable by Aavin Admin',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 33. Farmer Payment Cycles (15-Day Fortnight Billing Periods)
CREATE TABLE `farmer_payment_cycles` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cycle_code` VARCHAR(40) NOT NULL UNIQUE,
  `cycle_start_date` DATE NOT NULL,
  `cycle_end_date` DATE NOT NULL,
  `total_milk_litres` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount_inr` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('open', 'calculating', 'pending_approval', 'approved', 'disbursed') NOT NULL DEFAULT 'open',
  `approved_by_user_id` VARCHAR(36) NULL,
  `approved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 34. Payment Transactions
CREATE TABLE `payment_transactions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `transaction_reference` VARCHAR(60) NOT NULL UNIQUE,
  `payment_cycle_id` VARCHAR(36) NOT NULL,
  `farmer_user_id` VARCHAR(36) NOT NULL,
  `total_litres` DECIMAL(8,2) NOT NULL,
  `gross_amount_inr` DECIMAL(10,2) NOT NULL,
  `deductions_inr` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `net_payable_inr` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'approved', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  `bank_reference_number` VARCHAR(80) NULL,
  `payment_date` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`payment_cycle_id`) REFERENCES `farmer_payment_cycles` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_trans_farmer` (`farmer_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 35. Appointments (Vet Visits requested by Farmer or Scheduled by Admin)
CREATE TABLE `appointments` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `farmer_user_id` VARCHAR(36) NOT NULL,
  `cow_id` VARCHAR(36) NOT NULL,
  `vet_user_id` VARCHAR(36) NOT NULL,
  `requested_date` DATETIME NOT NULL,
  `appointment_type` ENUM('routine_checkup', 'artificial_insemination', 'illness_emergency', 'vaccination', 'pregnancy_diagnosis') NOT NULL,
  `farmer_notes` TEXT NULL,
  `photo_attachment_url` VARCHAR(255) NULL,
  `status` ENUM('requested', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
  `vet_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vet_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_appt_farmer` (`farmer_user_id`),
  INDEX `idx_appt_vet` (`vet_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 36. Notifications (In-App + Push Dispatch Ledger)
CREATE TABLE `notifications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `body` TEXT NOT NULL,
  `category` ENUM('safety_alert', 'withdrawal_warning', 'collection_receipt', 'payment_update', 'appointment_reminder', 'ai_fallback', 'system') NOT NULL,
  `related_entity_type` VARCHAR(50) NULL,
  `related_entity_id` VARCHAR(36) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user` (`user_id`, `is_read`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 37. AI Provider Settings (Backend Managed - NEVER exposed keys to mobile)
CREATE TABLE `ai_provider_settings` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `active_provider` ENUM('openrouter', 'own_api', 'disabled') NOT NULL DEFAULT 'openrouter',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `fallback_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `fallback_provider` ENUM('openrouter', 'own_api') NOT NULL DEFAULT 'own_api',
  `openrouter_model` VARCHAR(100) NOT NULL DEFAULT 'meta-llama/llama-3.3-70b-instruct:free',
  `own_api_model` VARCHAR(100) NOT NULL DEFAULT 'dairy-llama-7b',
  `timeout_ms` INT NOT NULL DEFAULT 15000,
  `max_retries` INT NOT NULL DEFAULT 2,
  `daily_token_budget` INT NOT NULL DEFAULT 1000000,
  `updated_by_user_id` VARCHAR(36) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 38. AI Usage Logs (Full Audit of Primary & Fallback Invocations)
CREATE TABLE `ai_usage_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `prompt_type` VARCHAR(60) NOT NULL,
  `provider_used` ENUM('openrouter', 'own_api') NOT NULL,
  `model_name` VARCHAR(100) NOT NULL,
  `is_fallback_invoked` TINYINT(1) NOT NULL DEFAULT 0,
  `fallback_trigger_reason` VARCHAR(255) NULL,
  `tokens_in` INT NOT NULL DEFAULT 0,
  `tokens_out` INT NOT NULL DEFAULT 0,
  `latency_ms` INT NOT NULL DEFAULT 0,
  `success` TINYINT(1) NOT NULL DEFAULT 1,
  `error_message` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_ai_log_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 39. Audit Logs (Clinical, Safety, Pricing, Auth, Settings Audit Trail)
CREATE TABLE `audit_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `actor_user_id` VARCHAR(36) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL,
  `entity_id` VARCHAR(36) NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_audit_actor` (`actor_user_id`, `created_at`),
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 40. Refresh Tokens
CREATE TABLE `refresh_tokens` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL UNIQUE,
  `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_refresh_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 4-STAGE AAVIN MILK COLLECTION & RECONCILIATION WORKFLOW
-- Farmer -> Booth -> BMC -> Union
-- ==========================================================

-- 41. Bulk Milk Coolers (BMCs)
CREATE TABLE IF NOT EXISTS `bmcs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(120) NOT NULL,
  `location` VARCHAR(150) NOT NULL,
  `district` VARCHAR(80) NOT NULL DEFAULT 'Madurai',
  `capacity_litres` DECIMAL(10,2) NOT NULL DEFAULT 15000.00,
  `manager_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 42. Milk Collection Booths
CREATE TABLE IF NOT EXISTS `booths` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(120) NOT NULL,
  `taluk` VARCHAR(80) NOT NULL DEFAULT 'Melur',
  `village` VARCHAR(100) NOT NULL,
  `district` VARCHAR(80) NOT NULL DEFAULT 'Madurai',
  `assigned_bmc_id` VARCHAR(36) NOT NULL,
  `capacity_litres` DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  `operator_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigned_bmc_id`) REFERENCES `bmcs` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 43. BMC Booth Assignments
CREATE TABLE IF NOT EXISTS `bmc_booth_assignments` (
  `bmc_id` VARCHAR(36) NOT NULL,
  `booth_id` VARCHAR(36) NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bmc_id`, `booth_id`),
  FOREIGN KEY (`bmc_id`) REFERENCES `bmcs` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booth_id`) REFERENCES `booths` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 44. Farmer Booth Assignments
CREATE TABLE IF NOT EXISTS `farmer_booth_assignments` (
  `farmer_user_id` VARCHAR(36) NOT NULL,
  `booth_id` VARCHAR(36) NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`farmer_user_id`, `booth_id`),
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`booth_id`) REFERENCES `booths` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 45. Milk Logistics Vendors / Collectors
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `vehicle_number` VARCHAR(50) NOT NULL,
  `vehicle_type` VARCHAR(60) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `route_name` VARCHAR(150) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 46. Milk Transactions (Authoritative Ledger for Route A and Route B)
CREATE TABLE IF NOT EXISTS `milk_transactions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `farmer_user_id` VARCHAR(36) NULL,
  `farmer_name` VARCHAR(100) NULL,
  `booth_id` VARCHAR(36) NOT NULL,
  `collection_date` DATE NOT NULL,
  `session` ENUM('morning', 'evening') NOT NULL,
  `quantity_litres` DECIMAL(8,2) NOT NULL,
  `route` ENUM('direct', 'vendor') NOT NULL,
  `vendor_id` VARCHAR(36) NULL,
  `vendor_name` VARCHAR(100) NULL,
  `measurement_method` ENUM('farmer_wise', 'combined') NOT NULL,
  `individual_allocation` ENUM('measured', 'not_available') NOT NULL DEFAULT 'measured',
  `status` ENUM('recorded', 'included_in_receipt', 'corrected') NOT NULL DEFAULT 'recorded',
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `receipt_id` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`farmer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`booth_id`) REFERENCES `booths` (`id`) ON DELETE RESTRICT,
  INDEX `idx_trans_date_booth` (`collection_date`, `booth_id`),
  INDEX `idx_trans_farmer` (`farmer_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 47. Digital Booth Receipts (Stage 2 Output: Booth -> BMC Dispatch)
CREATE TABLE IF NOT EXISTS `booth_receipts` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `booth_id` VARCHAR(36) NOT NULL,
  `booth_name` VARCHAR(120) NOT NULL,
  `bmc_id` VARCHAR(36) NOT NULL,
  `bmc_name` VARCHAR(120) NOT NULL,
  `collection_date` DATE NOT NULL,
  `session` ENUM('morning', 'evening', 'full_day') NOT NULL,
  `dispatch_quantity` DECIMAL(10,2) NOT NULL,
  `measurement_basis` ENUM('farmer_wise', 'combined', 'mixed') NOT NULL,
  `included_record_ids` JSON NOT NULL,
  `total_records_count` INT NOT NULL DEFAULT 0,
  `total_farmers_count` INT NOT NULL DEFAULT 0,
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `status` ENUM('draft', 'confirmed', 'sent_to_bmc') NOT NULL DEFAULT 'draft',
  `verification_code` VARCHAR(50) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` DATETIME NULL,
  FOREIGN KEY (`booth_id`) REFERENCES `booths` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`bmc_id`) REFERENCES `bmcs` (`id`) ON DELETE RESTRICT,
  INDEX `idx_booth_rcpt_date` (`collection_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 48. BMC Deliveries (Stage 3 Ledger: Intake & Quantity Verification)
CREATE TABLE IF NOT EXISTS `bmc_deliveries` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `booth_receipt_id` VARCHAR(50) NOT NULL,
  `booth_id` VARCHAR(36) NOT NULL,
  `booth_name` VARCHAR(120) NOT NULL,
  `bmc_id` VARCHAR(36) NOT NULL,
  `collection_date` DATE NOT NULL,
  `dispatch_time` DATETIME NOT NULL,
  `declared_dispatch_quantity` DECIMAL(10,2) NOT NULL,
  `measured_received_quantity` DECIMAL(10,2) NULL,
  `difference_litres` DECIMAL(8,2) NULL,
  `status` ENUM('pending_arrival', 'matched', 'mismatch_investigation', 'resolved', 'escalated_to_union') NOT NULL DEFAULT 'pending_arrival',
  `received_at` DATETIME NULL,
  `received_by_user_id` VARCHAR(36) NULL,
  `discrepancy_case_id` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`booth_receipt_id`) REFERENCES `booth_receipts` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`booth_id`) REFERENCES `booths` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`bmc_id`) REFERENCES `bmcs` (`id`) ON DELETE RESTRICT,
  INDEX `idx_bmc_deliv_date` (`collection_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 49. Discrepancy Cases (Quantity Mismatch Traceability Ledger)
CREATE TABLE IF NOT EXISTS `discrepancy_cases` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `bmc_delivery_id` VARCHAR(50) NOT NULL,
  `booth_id` VARCHAR(36) NOT NULL,
  `booth_name` VARCHAR(120) NOT NULL,
  `bmc_id` VARCHAR(36) NOT NULL,
  `bmc_name` VARCHAR(120) NOT NULL,
  `collection_date` DATE NOT NULL,
  `declared_quantity` DECIMAL(10,2) NOT NULL,
  `measured_quantity` DECIMAL(10,2) NOT NULL,
  `difference_litres` DECIMAL(8,2) NOT NULL,
  `difference_percent` DECIMAL(5,2) NOT NULL,
  `status` ENUM('open', 'under_investigation', 'resolved', 'escalated_to_union') NOT NULL DEFAULT 'open',
  `resolution_reason` VARCHAR(255) NULL,
  `resolved_at` DATETIME NULL,
  `resolved_by_user_id` VARCHAR(36) NULL,
  `union_review_notes` TEXT NULL,
  `union_reviewed_at` DATETIME NULL,
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bmc_delivery_id`) REFERENCES `bmc_deliveries` (`id`) ON DELETE RESTRICT,
  INDEX `idx_disc_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 50. Discrepancy Investigation Notes
CREATE TABLE IF NOT EXISTS `discrepancy_notes` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `discrepancy_id` VARCHAR(50) NOT NULL,
  `author_name` VARCHAR(100) NOT NULL,
  `note` TEXT NOT NULL,
  `evidence_reference` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`discrepancy_id`) REFERENCES `discrepancy_cases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 51. BMC Daily Receipts (Stage 4 Output: BMC -> Union Submission)
CREATE TABLE IF NOT EXISTS `bmc_receipts` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `bmc_id` VARCHAR(36) NOT NULL,
  `bmc_name` VARCHAR(120) NOT NULL,
  `union_id` VARCHAR(36) NOT NULL DEFAULT 'union-madurai-01',
  `collection_date` DATE NOT NULL,
  `included_delivery_ids` JSON NOT NULL,
  `total_booths_count` INT NOT NULL DEFAULT 0,
  `total_declared_quantity` DECIMAL(12,2) NOT NULL,
  `total_received_quantity` DECIMAL(12,2) NOT NULL,
  `net_difference` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `has_discrepancies` TINYINT(1) NOT NULL DEFAULT 0,
  `unresolved_cases_count` INT NOT NULL DEFAULT 0,
  `created_by_user_id` VARCHAR(36) NOT NULL,
  `status` ENUM('draft', 'sent_to_union', 'reviewed_by_union') NOT NULL DEFAULT 'draft',
  `verification_code` VARCHAR(50) NOT NULL,
  `union_review_notes` TEXT NULL,
  `reviewed_by_user_id` VARCHAR(36) NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` DATETIME NULL,
  FOREIGN KEY (`bmc_id`) REFERENCES `bmcs` (`id`) ON DELETE RESTRICT,
  INDEX `idx_bmcr_date` (`collection_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 52. Cattle Insemination & Breeding History
CREATE TABLE IF NOT EXISTS `insemination_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `cow_id` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `bull_id` VARCHAR(50) NOT NULL,
  `breed` VARCHAR(80) NOT NULL,
  `technician_name` VARCHAR(100) NOT NULL,
  `pregnancy_status` ENUM('pending', 'confirmed_pregnant', 'not_pregnant') NOT NULL DEFAULT 'pending',
  `expected_calving_date` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`cow_id`) REFERENCES `cows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 53. Audit Events Ledger
CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `actor_id` VARCHAR(36) NULL,
  `actor_name` VARCHAR(100) NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL,
  `entity_id` VARCHAR(60) NULL,
  `reason` VARCHAR(255) NULL,
  `details` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

