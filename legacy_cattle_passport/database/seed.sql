-- ==========================================================
-- AAVIN SMART CATTLE PASSPORT - SEED DATA
-- Default password for all demo accounts: Password@123
-- Bcrypt Hash ($2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG)
-- ==========================================================

USE `aavin_milkflow`;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles
INSERT INTO `roles` (`id`, `name`, `display_name`, `description`) VALUES
('role-admin', 'admin', 'Aavin Administrator', 'Complete system configuration, user management, and auditing'),
('role-farmer', 'farmer', 'Farmer / Cattle Owner', 'Manage cows, daily production, feed records, view payment ledgers'),
('role-vet', 'veterinary', 'Veterinary Doctor', 'Perform clinical checks, prescribe medicine, set withdrawal periods'),
('role-centre', 'collection_operator', 'Collection Centre Operator', 'Scan QR, enter milk quantities, record analyzer tests, issue receipts'),
('role-booth', 'booth', 'Society Staff', 'Manage society collections, review daily intakes, issue receipts'),
('role-bmc', 'bmc', 'BMC Staff', 'Receive bulk milk from societies, verify volumes, investigate discrepancies, issue BMC receipts'),
('role-union', 'union', 'Aavin Union Executive', 'Review BMC receipts, audit collection volumes, oversee dispute resolutions'),
('role-vendor', 'transport_vendor', 'Milk Transport / Logistics Vendor', 'Dispatch and transport bulk milk batches to Aavin central dairy');

-- 2. Users (Admin, 2 Farmers, 1 Vet, 1 Collection Operator, 1 Vendor, 1 Booth, 1 BMC, 1 Union)
-- Password for all: Password@123
INSERT INTO `users` (`id`, `username`, `email`, `phone`, `password_hash`, `full_name`, `status`, `preferred_language`) VALUES
('usr-admin-01', 'admin_aavin', 'admin.madurai@aavin.tn.gov.in', '9842000001', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'Dr. S. Sundaram (Admin)', 'active', 'en'),
('usr-farmer-01', 'farmer_murugan', 'murugan.dairy@gmail.com', '9842000002', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'K. Murugesan (Farmer)', 'active', 'ta'),
('usr-farmer-02', 'farmer_selvi', 'selvi.farms@gmail.com', '9842000003', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'M. Selvi (Farmer)', 'active', 'ta'),
('usr-vet-01', 'vet_anand', 'dr.anand.vet@aavin.tn.gov.in', '9842000004', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'Dr. R. Anand BVSc (Veterinary Officer)', 'active', 'en'),
('usr-centre-01', 'operator_kannan', 'kannan.cc@aavin.tn.gov.in', '9842000005', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'P. Kannan (Centre In-Charge)', 'active', 'en'),
('usr-booth-01', 'booth_kannan', 'booth.kannan@aavin.tn.gov.in', '9842000009', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'P. Kannan (Booth Officer)', 'active', 'ta'),
('usr-booth-02', 'booth_muthu', 'muthu.booth@aavin.tn.gov.in', '9842000011', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'S. Muthu (Booth Officer)', 'active', 'ta'),
('usr-bmc-01', 'bmc_raman', 'raman.bmc@aavin.tn.gov.in', '9842000007', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'M. Ramanathan (BMC Manager)', 'active', 'en'),
('usr-union-01', 'union_director', 'director.union@aavin.tn.gov.in', '9842000008', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'Er. K. Rajendran (Union GM)', 'active', 'en'),
('usr-vendor-01', 'vendor_kumar', 'kumar.transport@gmail.com', '9842000006', '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 'V. Kumar (Tanker Logistics)', 'active', 'en');

-- 3. User Roles Mapping
INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
('usr-admin-01', 'role-admin'),
('usr-farmer-01', 'role-farmer'),
('usr-farmer-02', 'role-farmer'),
('usr-vet-01', 'role-vet'),
('usr-centre-01', 'role-centre'),
('usr-booth-01', 'role-booth'),
('usr-booth-02', 'role-booth'),
('usr-bmc-01', 'role-bmc'),
('usr-union-01', 'role-union'),
('usr-vendor-01', 'role-vendor');

-- 4. Collection Centres (Madurai District)
INSERT INTO `collection_centres` (`id`, `centre_code`, `name`, `taluk`, `village`, `district`, `contact_person`, `phone`, `capacity_litres_per_day`) VALUES
('cc-melur-01', 'AAVIN-CC-MDU-01', 'Melur Primary Milk Producers Co-op Society', 'Melur', 'Melur Town', 'Madurai', 'P. Kannan', '9842000005', 6000.00),
('cc-alanganallur-02', 'AAVIN-CC-MDU-02', 'Alanganallur Dairy Collection Centre', 'Vadipatti', 'Alanganallur', 'Madurai', 'M. Ramanathan', '9842000010', 4500.00);

-- 5. Farmer Profiles
INSERT INTO `farmer_profiles` (`user_id`, `farmer_id_code`, `village`, `taluk`, `bank_account_name`, `bank_name`, `bank_account_number`, `bank_ifsc`, `upi_id`, `primary_centre_id`) VALUES
('usr-farmer-01', 'FARM-MDU-101', 'Melur Rural', 'Melur', 'K Murugesan', 'Canara Bank - Melur', '109283746501', 'CNRB0001092', 'murugan@okhdfcbank', 'cc-melur-01'),
('usr-farmer-02', 'FARM-MDU-102', 'Navinipatti', 'Melur', 'M Selvi', 'State Bank of India - Melur', '38492019482', 'SBIN0000874', 'selvi.dairy@upi', 'cc-melur-01');

-- 6. Veterinary Profiles
INSERT INTO `veterinary_profiles` (`user_id`, `vet_license_number`, `specialization`, `assigned_zone`, `hospital_dispensary_name`) VALUES
('usr-vet-01', 'TN-VET-2018-4921', 'Bovine Reproduction & Pathology', 'Melur, Kottampatti, Madurai East', 'Aavin Veterinary Dispensary, Melur Branch');

-- 7. Vendor Profiles
INSERT INTO `vendor_profiles` (`user_id`, `vendor_code`, `vehicle_registration_number`, `vehicle_type`, `driver_license_number`, `route_name`) VALUES
('usr-vendor-01', 'VEND-MDU-501', 'TN-59-BZ-4819', 'Insulated Stainless Steel Tanker (3000L)', 'DL-TN59-2015-0912', 'Melur -> Othakadai -> Madurai Central Dairy Plant');

-- 8. Centre Farmer Assignments
INSERT INTO `centre_farmer_assignments` (`centre_id`, `farmer_user_id`) VALUES
('cc-melur-01', 'usr-farmer-01'),
('cc-melur-01', 'usr-farmer-02');

-- 9. Cows (Digital Cattle Passport)
INSERT INTO `cows` (`id`, `tag_number`, `name`, `breed`, `gender`, `date_of_birth`, `approximate_age_months`, `current_owner_user_id`, `primary_centre_id`, `health_status`, `lactation_stage`, `milking_status`, `average_daily_yield`, `photo_url`, `identification_marks`) VALUES
('cow-mdu-001', 'TN-MDU-COW-1001', 'Kamadhenu (Jersey Cross)', 'Jersey Cross', 'female', '2021-03-15', 42, 'usr-farmer-01', 'cc-melur-01', 'healthy', 'peak', 'lactating', 14.50, 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500', 'White star patch on forehead, notched right ear tag #1001'),
('cow-mdu-002', 'TN-MDU-COW-1002', 'Lakshmi (HF Cross)', 'Holstein Friesian Cross', 'female', '2020-08-10', 49, 'usr-farmer-01', 'cc-melur-01', 'under_treatment', 'mid', 'quarantine_hold', 16.00, 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500', 'Black and white spots, left horn tip curved inward'),
('cow-mdu-003', 'TN-MDU-COW-1003', 'Ganga (Kangayam Native)', 'Kangayam', 'female', '2022-01-20', 32, 'usr-farmer-02', 'cc-melur-01', 'healthy', 'early', 'lactating', 10.00, 'https://images.unsplash.com/photo-1527153857715-3908f2ae5e81?w=500', 'Greyish white coat, prominent hump, dark eyes'),
('cow-mdu-004', 'TN-MDU-COW-1004', 'Ponni (Sindhi Cross)', 'Red Sindhi Cross', 'female', '2021-11-05', 34, 'usr-farmer-02', 'cc-melur-01', 'healthy', 'peak', 'lactating', 13.00, 'https://images.unsplash.com/photo-1596733430284-f7437764b149?w=500', 'Deep red reddish-brown coat, docile temperament'),
('cow-mdu-005', 'TN-MDU-COW-1005', 'Gowri (Jersey Cross)', 'Jersey Cross', 'female', '2022-05-10', 28, 'usr-farmer-01', 'cc-melur-01', 'healthy', 'early', 'lactating', 12.50, 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500', 'Brown muzzle with white chest spot, ear tag #1005'),
('cow-mdu-006', 'TN-MDU-COW-1006', 'Kaveri (Gir Cross)', 'Gir Cross', 'female', '2021-09-18', 36, 'usr-farmer-02', 'cc-melur-01', 'healthy', 'mid', 'lactating', 15.00, 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500', 'Distinct convex forehead and long pendulous ears, tag #1006');

-- 10. QR Tokens (Opaque secure lookup tokens)
INSERT INTO `cow_qr_tokens` (`id`, `cow_id`, `token`) VALUES
('qrt-001', 'cow-mdu-001', 'AAVIN_QR_TOKEN_9A3E4B8C1F7D_1001'),
('qrt-002', 'cow-mdu-002', 'AAVIN_QR_TOKEN_7F2A1C9E8B4D_1002'),
('qrt-003', 'cow-mdu-003', 'AAVIN_QR_TOKEN_3D8C4B1F7E9A_1003'),
('qrt-004', 'cow-mdu-004', 'AAVIN_QR_TOKEN_5B1F7E9A3D8C_1004'),
('qrt-005', 'cow-mdu-005', 'AAVIN_QR_TOKEN_8E2D1F4B9A3C_1005'),
('qrt-006', 'cow-mdu-006', 'AAVIN_QR_TOKEN_4B9A3C8E2D1F_1006');

-- 11. Cow Vet Assignments
INSERT INTO `cow_veterinarian_assignments` (`id`, `cow_id`, `vet_user_id`, `is_primary`, `notes`) VALUES
('cva-001', 'cow-mdu-001', 'usr-vet-01', 1, 'Assigned to Dr. Anand for regular preventive care'),
('cva-002', 'cow-mdu-002', 'usr-vet-01', 1, 'Assigned to Dr. Anand - Mastitis treatment in progress'),
('cva-003', 'cow-mdu-003', 'usr-vet-01', 1, 'Assigned to Dr. Anand'),
('cva-004', 'cow-mdu-004', 'usr-vet-01', 1, 'Assigned to Dr. Anand');

-- 12. Medicine Catalog
INSERT INTO `medicine_catalog` (`id`, `brand_name`, `generic_name`, `category`, `default_milk_withdrawal_days`, `default_meat_withdrawal_days`, `unit_of_measure`, `manufacturer`, `warning_notes`) VALUES
('med-01', 'Ceftiofur Sodium Inj (Excenel)', 'Ceftiofur Sodium', 'antibiotic', 0, 4, 'ml', 'Zoetis India', 'Zero milk discard when used strictly as per recommended dose'),
('med-02', 'Amoxicillin & Cloxacillin (Intramammary)', 'Amoxicillin + Cloxacillin', 'antibiotic', 4, 14, 'tube', 'Virbac Animal Health', 'Strict 96-hour milk withholding required from last infusion'),
('med-03', 'Enrofloxacin 10% (Floxidin)', 'Enrofloxacin', 'antibiotic', 5, 14, 'ml', 'Intas Pharmaceuticals', 'Severe antibiotic residue risk - 5 days milk withdrawal mandatory'),
('med-04', 'Meloxicam Inj (Melonex)', 'Meloxicam 5mg/ml', 'anti_inflammatory', 3, 5, 'ml', 'Intas Pharmaceuticals', 'NSAID for pain and pyrexia - 72 hours milk withdrawal'),
('med-05', 'Ivermectin 1% (Hitek)', 'Ivermectin', 'anthelmintic', 7, 28, 'ml', 'Virbac Animal Health', 'Not recommended in milking cows unless dry');

-- 13. Treatment Records (Cow 002 has ACTIVE WITHDRAWAL HOLD!)
INSERT INTO `treatment_records` (`id`, `cow_id`, `vet_user_id`, `medicine_id`, `dosage`, `route_of_administration`, `treatment_start_date`, `treatment_end_date`, `withdrawal_period_days`, `milk_withholding_end_time`, `reason_for_treatment`, `notes`) VALUES
('trt-001', 'cow-mdu-002', 'usr-vet-01', 'med-02', '1 tube per quarter bid x 3 days', 'intramammary', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 4, DATE_ADD(NOW(), INTERVAL 4 DAY), 'Acute Clinical Mastitis in Left Hind Quarter', 'Intramammary antibiotic infused. Milk must be strictly withheld until withdrawal period completes.');

-- 14. Withdrawal Restrictions (Ledger entry for active withdrawal)
INSERT INTO `withdrawal_restrictions` (`id`, `treatment_id`, `cow_id`, `restriction_start`, `restriction_end`, `status`, `reason`) VALUES
('wd-001', 'trt-001', 'cow-mdu-002', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 4 DAY), 'active', 'Active withdrawal due to Amoxicillin/Cloxacillin intramammary antibiotic treatment');

-- 15. Cow Health Records
INSERT INTO `cow_health_records` (`id`, `cow_id`, `recorded_by_vet_user_id`, `examination_date`, `body_temperature_c`, `heart_rate_bpm`, `rumen_motility`, `body_condition_score`, `clinical_signs`, `diagnosis`, `health_status_assigned`, `recommendations`, `next_follow_up_date`) VALUES
('hlth-001', 'cow-mdu-001', 'usr-vet-01', DATE_SUB(NOW(), INTERVAL 7 DAY), 38.6, 68, 'Normal (3/2min)', 3.5, 'Active, alert, clear eyes, good rumen fill', 'Healthy Bovine - Optimal Lactation', 'healthy', 'Continue balanced mineral mix 50g/day and green fodder', DATE_ADD(NOW(), INTERVAL 23 DAY)),
('hlth-002', 'cow-mdu-002', 'usr-vet-01', DATE_SUB(NOW(), INTERVAL 1 DAY), 39.4, 82, 'Slightly sluggish (1/2min)', 3.0, 'Swollen left hind quarter, mild fever, clotted milk secretion', 'Clinical Mastitis', 'under_treatment', 'Strict milk discard. Complete antibiotic course. Teat dip after milking.', DATE_ADD(NOW(), INTERVAL 3 DAY)),
('hlth-003', 'cow-mdu-003', 'usr-vet-01', DATE_SUB(NOW(), INTERVAL 15 DAY), 38.5, 64, 'Normal (3/2min)', 3.8, 'Native vigour, healthy coat, bright mucosal membrane', 'Healthy Native Cow', 'healthy', 'Routine grazing + concentrate supplement', DATE_ADD(NOW(), INTERVAL 45 DAY));

-- 16. Feed Types
INSERT INTO `feed_types` (`id`, `name`, `category`, `nutritional_notes`) VALUES
('feed-01', 'Co-4 Hybrid Napier Grass (Green)', 'green_fodder', 'High protein (10-12%), succulent, improves milk volume'),
('feed-02', 'Paddy Straw (Dry Fodder)', 'dry_fodder', 'Essential dietary crude fiber, aids rumen digestion'),
('feed-03', 'Aavin Cattle Feed Pellet (Concentrate)', 'concentrate', '20% Crude Protein, 3% Fat, enriched with bypass fat'),
('feed-04', 'Aavin Mineral Mixture (Chelated)', 'mineral_mixture', 'Contains Ca, P, Zn, Cu, Co, Vitamin ADE for udder health');

-- 17. Feeding Records
INSERT INTO `feeding_records` (`id`, `cow_id`, `farmer_user_id`, `feed_type_id`, `quantity_kg`, `feeding_time`, `feeding_date`, `notes`) VALUES
('fr-001', 'cow-mdu-001', 'usr-farmer-01', 'feed-01', 20.00, 'morning', CURDATE(), 'Freshly chopped Napier grass given after milking'),
('fr-002', 'cow-mdu-001', 'usr-farmer-01', 'feed-03', 4.00, 'morning', CURDATE(), 'Aavin feed pellet with 50g mineral mix'),
('fr-003', 'cow-mdu-002', 'usr-farmer-01', 'feed-01', 15.00, 'morning', CURDATE(), 'Green fodder fed in isolation shed'),
('fr-004', 'cow-mdu-003', 'usr-farmer-02', 'feed-01', 18.00, 'morning', CURDATE(), 'Mixed Co-4 and Sorghum fodder');

-- 18. Milk Production Records (Farmer On-Farm Milking)
INSERT INTO `milk_production_records` (`id`, `cow_id`, `farmer_user_id`, `session`, `production_date`, `quantity_litres`, `milking_time`, `cow_condition_notes`) VALUES
('mpr-001', 'cow-mdu-001', 'usr-farmer-01', 'morning', CURDATE(), 7.80, '05:45:00', 'Clean milk, healthy udder'),
('mpr-002', 'cow-mdu-001', 'usr-farmer-01', 'evening', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 6.70, '17:30:00', 'Normal evening yield'),
('mpr-003', 'cow-mdu-003', 'usr-farmer-02', 'morning', CURDATE(), 5.20, '06:00:00', 'Native Kangayam rich milk'),
('mpr-004', 'cow-mdu-004', 'usr-farmer-02', 'morning', CURDATE(), 6.50, '06:15:00', 'Good milking session');

-- 19. Collection Sessions
INSERT INTO `collection_sessions` (`id`, `centre_id`, `session_date`, `session_type`, `opened_by_user_id`, `total_litres_collected`, `total_farmers_attended`, `status`) VALUES
('cs-mdu-today-morn', 'cc-melur-01', CURDATE(), 'morning', 'usr-centre-01', 19.50, 2, 'open');

-- 20. Quality Threshold Versions (Admin Policy)
INSERT INTO `quality_threshold_versions` (`id`, `version_code`, `title`, `min_fat_percent`, `min_snf_percent`, `min_density_g_cm3`, `max_density_g_cm3`, `max_temperature_c`, `fat_review_min`, `fat_review_max`, `snf_review_min`, `snf_review_max`, `effective_from`, `created_by_user_id`) VALUES
('qtv-v1', 'AAVIN-STD-2025-Q1', 'Aavin Cow Milk Quality Standard 2025/26', 3.50, 8.50, 1.0260, 1.0320, 12.0, 3.00, 3.49, 8.00, 8.49, '2025-01-01 00:00:00', 'usr-admin-01');

-- 21. Safety Rule Versions
INSERT INTO `safety_rule_versions` (`id`, `rule_version_name`, `description`, `mandatory_tests`, `effective_from`, `is_active`) VALUES
('srv-v1', 'AAVIN-TWIN-ENGINE-V2.1', 'Deterministic 4-Domain Safety Decision Engine', '["fat", "snf", "temperature", "adulteration_screen", "active_withdrawal_check"]', '2025-01-01 00:00:00', 1);

-- 22. Pricing Rules
INSERT INTO `milk_pricing_rules` (`id`, `rule_code`, `title`, `base_rate_per_litre`, `standard_fat_percent`, `standard_snf_percent`, `fat_increment_per_point`, `snf_increment_per_point`, `quality_incentive_flat`, `effective_from`, `notes`) VALUES
('mpr-rate-2025', 'AAVIN-COW-RATE-2025', 'Aavin Madurai Procurement Rate Schedule', 36.50, 4.00, 8.50, 0.35, 0.25, 1.00, '2025-01-01', 'SAMPLE DATA - Transparent pricing based on FAT and SNF');

-- 23. Sample Milk Collection Records & Quality Tests & Decisions

-- Example 1: Cow 001 -> CLEAR
INSERT INTO `milk_collection_records` (`id`, `receipt_number`, `collection_session_id`, `centre_id`, `farmer_user_id`, `cow_id`, `operator_user_id`, `quantity_litres`, `temperature_c`, `equipment_device_id`, `calculated_amount_inr`, `rate_per_litre_applied`, `payment_status`) VALUES
('col-001', 'RCP-MDU-2026-001', 'cs-mdu-today-morn', 'cc-melur-01', 'usr-farmer-01', 'cow-mdu-001', 'usr-centre-01', 7.50, 7.2, 'EKOMILK-ULTRA-01', 288.75, 38.50, 'calculated');

INSERT INTO `milk_quality_tests` (`id`, `collection_record_id`, `analyzer_device_id`, `fat_percentage`, `snf_percentage`, `density_g_cm3`, `acidity_ph`, `adulteration_screened`, `adulteration_detected`, `threshold_version_id`, `is_demo_data`) VALUES
('qt-001', 'col-001', 'EKOMILK-ULTRA-01', 4.30, 8.70, 1.0285, 6.65, 1, 0, 'qtv-v1', 0);

INSERT INTO `milk_safety_decisions` (`id`, `collection_record_id`, `decision`, `primary_reason`, `decision_details`, `withdrawal_status`, `rule_version_id`) VALUES
('msd-001', 'col-001', 'CLEAR', 'All clinical checks and quality metrics passed Aavin standards', '{"checks": {"withdrawal": "PASSED (No active restriction)", "fat": "4.30% >= 3.50% (PASSED)", "snf": "8.70% >= 8.50% (PASSED)", "temperature": "7.2C <= 12.0C (PASSED)", "adulteration": "NEGATIVE (CLEARED)"}}', 'none', 'srv-v1');

-- Example 2: Cow 003 -> REVIEW (Fat slightly below threshold 3.35%)
INSERT INTO `milk_collection_records` (`id`, `receipt_number`, `collection_session_id`, `centre_id`, `farmer_user_id`, `cow_id`, `operator_user_id`, `quantity_litres`, `temperature_c`, `equipment_device_id`, `calculated_amount_inr`, `rate_per_litre_applied`, `payment_status`) VALUES
('col-002', 'RCP-MDU-2026-002', 'cs-mdu-today-morn', 'cc-melur-01', 'usr-farmer-02', 'cow-mdu-003', 'usr-centre-01', 5.00, 8.1, 'EKOMILK-ULTRA-01', 171.00, 34.20, 'unprocessed');

INSERT INTO `milk_quality_tests` (`id`, `collection_record_id`, `analyzer_device_id`, `fat_percentage`, `snf_percentage`, `density_g_cm3`, `acidity_ph`, `adulteration_screened`, `adulteration_detected`, `threshold_version_id`, `is_demo_data`) VALUES
('qt-002', 'col-002', 'EKOMILK-ULTRA-01', 3.30, 8.40, 1.0265, 6.70, 1, 0, 'qtv-v1', 0);

INSERT INTO `milk_safety_decisions` (`id`, `collection_record_id`, `decision`, `primary_reason`, `decision_details`, `withdrawal_status`, `rule_version_id`) VALUES
('msd-002', 'col-002', 'REVIEW', 'Fat (3.30%) and SNF (8.40%) are in the review boundary range (3.00-3.49% / 8.00-8.49%)', '{"checks": {"withdrawal": "PASSED", "fat": "3.30% (REVIEW RANGE 3.0-3.49%)", "snf": "8.40% (REVIEW RANGE 8.0-8.49%)", "temperature": "8.1C (PASSED)", "adulteration": "NEGATIVE"}}', 'none', 'srv-v1');

-- Example 3: Cow 002 attempted collection -> CRITICAL HOLD (Active Withdrawal Restriction)
INSERT INTO `milk_collection_records` (`id`, `receipt_number`, `collection_session_id`, `centre_id`, `farmer_user_id`, `cow_id`, `operator_user_id`, `quantity_litres`, `temperature_c`, `equipment_device_id`, `calculated_amount_inr`, `rate_per_litre_applied`, `payment_status`) VALUES
('col-003', 'RCP-MDU-2026-003', 'cs-mdu-today-morn', 'cc-melur-01', 'usr-farmer-01', 'cow-mdu-002', 'usr-centre-01', 7.00, 7.8, 'EKOMILK-ULTRA-01', 0.00, 0.00, 'unprocessed');

INSERT INTO `milk_quality_tests` (`id`, `collection_record_id`, `analyzer_device_id`, `fat_percentage`, `snf_percentage`, `density_g_cm3`, `acidity_ph`, `adulteration_screened`, `adulteration_detected`, `threshold_version_id`, `is_demo_data`) VALUES
('qt-003', 'col-003', 'EKOMILK-ULTRA-01', 4.10, 8.60, 1.0280, 6.60, 1, 0, 'qtv-v1', 0);

INSERT INTO `milk_safety_decisions` (`id`, `collection_record_id`, `decision`, `primary_reason`, `decision_details`, `withdrawal_status`, `withdrawal_end_time`, `rule_version_id`) VALUES
('msd-003', 'col-003', 'HOLD', 'MANDATORY HOLD: Active veterinary antibiotic withdrawal period until ' || DATE_ADD(NOW(), INTERVAL 4 DAY), '{"checks": {"withdrawal": "FAILED - ACTIVE WITHDRAWAL IN FORCE", "medicine": "Amoxicillin/Cloxacillin", "reason": "Antibiotic residue risk for human consumption"}}', 'active_hold', DATE_ADD(NOW(), INTERVAL 4 DAY), 'srv-v1');

-- 24. Milk Batches
INSERT INTO `milk_batches` (`id`, `batch_number`, `centre_id`, `total_litres`, `avg_fat_percent`, `avg_snf_percent`, `batch_safety_status`, `can_count`, `storage_tanker_number`, `status`, `created_by_user_id`) VALUES
('batch-mdu-001', 'AAVIN-BATCH-2026-0412', 'cc-melur-01', 1250.00, 4.25, 8.65, 'CLEAR', 30, 'TN-59-BZ-4819', 'assembled', 'usr-centre-01');

-- 25. Vendor Assignments
INSERT INTO `vendor_assignments` (`id`, `vendor_user_id`, `centre_id`, `destination_plant`, `is_active`) VALUES
('va-001', 'usr-vendor-01', 'cc-melur-01', 'Aavin Madurai Main Dairy Plant, Sathamangalam', 1);

-- 26. Batch Movements
INSERT INTO `batch_movements` (`id`, `batch_id`, `vendor_user_id`, `event_type`, `litres_recorded`, `temperature_c`, `location_latitude`, `location_longitude`, `remarks`) VALUES
('bm-001', 'batch-mdu-001', 'usr-vendor-01', 'pickup_scanned', 1250.00, 4.5, 9.92520000, 78.11980000, 'Batch verified and loaded into chilled tanker');

-- 27. Payment Cycles (15-day cycle)
INSERT INTO `farmer_payment_cycles` (`id`, `cycle_code`, `cycle_start_date`, `cycle_end_date`, `total_milk_litres`, `total_amount_inr`, `status`) VALUES
('cyc-2026-apr-1', 'CYC-2026-APR-F1', '2026-04-01', '2026-04-15', 18450.00, 682650.00, 'open');

-- 28. Payment Transactions
INSERT INTO `payment_transactions` (`id`, `transaction_reference`, `payment_cycle_id`, `farmer_user_id`, `total_litres`, `gross_amount_inr`, `deductions_inr`, `net_payable_inr`, `status`, `bank_reference_number`, `payment_date`) VALUES
('tx-001', 'TXN-AAVIN-2026-901', 'cyc-2026-apr-1', 'usr-farmer-01', 225.50, 8681.75, 0.00, 8681.75, 'approved', 'NEFT-AAVIN-0928192', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('tx-002', 'TXN-AAVIN-2026-902', 'cyc-2026-apr-1', 'usr-farmer-02', 190.00, 6935.00, 0.00, 6935.00, 'pending', NULL, NULL);

-- 29. Appointments
INSERT INTO `appointments` (`id`, `farmer_user_id`, `cow_id`, `vet_user_id`, `requested_date`, `appointment_type`, `farmer_notes`, `status`) VALUES
('apt-001', 'usr-farmer-01', 'cow-mdu-002', 'usr-vet-01', DATE_ADD(NOW(), INTERVAL 2 DAY), 'illness_emergency', 'Follow-up on mastitis recovery and post-treatment check', 'confirmed'),
('apt-002', 'usr-farmer-02', 'cow-mdu-003', 'usr-vet-01', DATE_ADD(NOW(), INTERVAL 4 DAY), 'artificial_insemination', 'First artificial insemination heat cycle observed', 'requested');

-- 30. Notifications
INSERT INTO `notifications` (`id`, `user_id`, `title`, `body`, `category`, `related_entity_type`, `related_entity_id`, `is_read`) VALUES
('notif-001', 'usr-farmer-01', 'Withdrawal Period Alert', 'Warning: Cow #TN-MDU-COW-1002 is under active antibiotic withdrawal until 4 days from now. Milk cannot be supplied.', 'withdrawal_warning', 'cow', 'cow-mdu-002', 0),
('notif-002', 'usr-farmer-01', 'Milk Collection Receipt Generated', '7.50 Litres collected today morning at Melur CC. Status: CLEAR. Amount: Rs. 288.75.', 'collection_receipt', 'collection', 'col-001', 0),
('notif-003', 'usr-vet-01', 'New Appointment Request', 'Farmer K. Murugesan requested follow-up check for cow #TN-MDU-COW-1002.', 'appointment_reminder', 'appointment', 'apt-001', 0),
('notif-004', 'usr-admin-01', 'System Ready', 'Aavin Milk Safety Twin server initialized successfully with 6 active nodes.', 'system', NULL, NULL, 1);

-- 31. AI Provider Settings (Backend Managed)
INSERT INTO `ai_provider_settings` (`id`, `active_provider`, `is_enabled`, `fallback_enabled`, `fallback_provider`, `openrouter_model`, `own_api_model`, `timeout_ms`, `max_retries`, `daily_token_budget`) VALUES
('ai-set-01', 'own_api', 1, 0, 'openrouter', 'meta-llama/llama-3.3-70b-instruct:free', 'gemma3:12b', 90000, 1, 1000000);

-- 32. Audit Logs
INSERT INTO `audit_logs` (`id`, `actor_user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`) VALUES
('aud-001', 'usr-admin-01', 'SYSTEM_INIT', 'system', 'system-root', '{"event": "Aavin Smart Cattle Passport initialized with sample seed data"}', '127.0.0.1'),
('aud-002', 'usr-vet-01', 'TREATMENT_RECORDED_WITHDRAWAL_SET', 'treatment_records', 'trt-001', '{"cow_tag": "TN-MDU-COW-1002", "withdrawal_days": 4, "medicine": "Amoxicillin/Cloxacillin"}', '127.0.0.1');

-- 33. BMCs (Bulk Milk Coolers)
INSERT INTO `bmcs` (`id`, `code`, `name`, `location`, `district`, `capacity_litres`, `manager_name`, `phone`) VALUES
('bmc-mdu-01', 'AAVIN-BMC-MDU-01', 'Melur Bulk Milk Cooling Centre', 'Madurai-Trichy NH Road, Melur', 'Madurai', 15000.00, 'M. Ramanathan', '9842000007'),
('bmc-mdu-02', 'AAVIN-BMC-MDU-02', 'Vadipatti Bulk Milk Cooling Centre', 'Alanganallur Road, Vadipatti', 'Madurai', 12000.00, 'T. Senthil Kumar', '9842000015');

-- 34. Collection Societies
INSERT INTO `booths` (`id`, `code`, `name`, `taluk`, `village`, `district`, `assigned_bmc_id`, `capacity_litres`, `operator_name`, `phone`) VALUES
('booth-mdu-01', 'AAVIN-BOOTH-MDU-01', 'Melur Town Primary Milk Producers Co-op Society #1', 'Melur', 'Melur', 'Madurai', 'bmc-mdu-01', 4000.00, 'P. Kannan', '9842000009'),
('booth-mdu-02', 'AAVIN-BOOTH-MDU-02', 'Navinipatti Village Milk Collection Society #2', 'Melur', 'Navinipatti', 'Madurai', 'bmc-mdu-01', 3500.00, 'S. Muthu', '9842000011'),
('booth-mdu-03', 'AAVIN-BOOTH-MDU-03', 'Alanganallur Village Collection Society #3', 'Vadipatti', 'Alanganallur', 'Madurai', 'bmc-mdu-02', 3000.00, 'K. Vasanthan', '9842000012');

-- 35. BMC Booth Assignments
INSERT INTO `bmc_booth_assignments` (`bmc_id`, `booth_id`) VALUES
('bmc-mdu-01', 'booth-mdu-01'),
('bmc-mdu-01', 'booth-mdu-02'),
('bmc-mdu-02', 'booth-mdu-03');

-- 36. Farmer Booth Assignments
INSERT INTO `farmer_booth_assignments` (`farmer_user_id`, `booth_id`) VALUES
('usr-farmer-01', 'booth-mdu-01'),
('usr-farmer-02', 'booth-mdu-01'),
('usr-farmer-02', 'booth-mdu-02');

-- 37. Vendors
INSERT INTO `vendors` (`id`, `code`, `name`, `vehicle_number`, `vehicle_type`, `phone`, `route_name`) VALUES
('vend-mdu-01', 'VEND-MDU-501', 'V. Kumar Milk Transport', 'TN-59-BZ-4819', 'Insulated Stainless Steel Tanker (3000L)', '9842000006', 'Melur Rural -> Melur BMC Hub');

-- 38. Initial Milk Transactions (Route A Direct & Route B Vendor)
INSERT INTO `milk_transactions` (`id`, `farmer_user_id`, `farmer_name`, `booth_id`, `collection_date`, `session`, `quantity_litres`, `route`, `vendor_id`, `vendor_name`, `measurement_method`, `individual_allocation`, `status`, `created_by_user_id`, `notes`) VALUES
('mtx-001', 'usr-farmer-01', 'K. Murugesan', 'booth-mdu-01', CURRENT_DATE(), 'morning', 14.50, 'direct', NULL, NULL, 'farmer_wise', 'measured', 'recorded', 'usr-booth-01', 'Morning farm direct supply, Kamadhenu cow'),
('mtx-002', 'usr-farmer-02', 'M. Selvi', 'booth-mdu-01', CURRENT_DATE(), 'morning', 10.00, 'direct', NULL, NULL, 'farmer_wise', 'measured', 'recorded', 'usr-booth-01', 'Direct supply, Ganga cow'),
('mtx-003', NULL, NULL, 'booth-mdu-01', CURRENT_DATE(), 'morning', 75.50, 'vendor', 'vend-mdu-01', 'V. Kumar Milk Transport', 'combined', 'not_available', 'recorded', 'usr-booth-01', 'Vendor combined collection from Navinipatti cluster');

-- 39. Seed Booth Receipt (Stage 2 -> Stage 3)
INSERT INTO `booth_receipts` (`id`, `booth_id`, `booth_name`, `bmc_id`, `bmc_name`, `collection_date`, `session`, `dispatch_quantity`, `measurement_basis`, `included_record_ids`, `total_records_count`, `total_farmers_count`, `created_by_user_id`, `status`, `verification_code`) VALUES
('BR-2026-MDU-001', 'booth-mdu-01', 'Melur Town Primary Milk Producers Co-op Society #1', 'bmc-mdu-01', 'Melur Bulk Milk Cooling Centre', CURRENT_DATE(), 'morning', 1000.00, 'mixed', '["mtx-001", "mtx-002", "mtx-003"]', 3, 2, 'usr-booth-01', 'sent_to_bmc', 'VCODE-MDU-BR-1001-AAVIN');

-- 40. Seed BMC Deliveries
INSERT INTO `bmc_deliveries` (`id`, `booth_receipt_id`, `booth_id`, `booth_name`, `bmc_id`, `collection_date`, `dispatch_time`, `declared_dispatch_quantity`, `measured_received_quantity`, `difference_litres`, `status`, `received_at`, `received_by_user_id`) VALUES
('DEL-2026-001', 'BR-2026-MDU-001', 'booth-mdu-01', 'Melur Town Primary Milk Producers Co-op Society #1', 'bmc-mdu-01', CURRENT_DATE(), NOW(), 1000.00, 970.00, 30.00, 'mismatch_investigation', NOW(), 'usr-bmc-01');

-- 41. Discrepancy Case (Difference = 1000 - 970 = 30L)
INSERT INTO `discrepancy_cases` (`id`, `bmc_delivery_id`, `booth_id`, `booth_name`, `bmc_id`, `bmc_name`, `collection_date`, `declared_quantity`, `measured_quantity`, `difference_litres`, `difference_percent`, `status`, `created_by_user_id`) VALUES
('DISC-MDU-101', 'DEL-2026-001', 'booth-mdu-01', 'Melur Town Primary Milk Producers Co-op Society #1', 'bmc-mdu-01', 'Melur Bulk Milk Cooling Centre', CURRENT_DATE(), 1000.00, 970.00, 30.00, 3.00, 'under_investigation', 'usr-bmc-01');

INSERT INTO `discrepancy_notes` (`id`, `discrepancy_id`, `author_name`, `note`, `evidence_reference`) VALUES
('dnote-001', 'DISC-MDU-101', 'M. Ramanathan (BMC Manager)', 'Dipstick and flow-meter calibrated calibration check showed 970L. Tanker valve #2 inspection requested.', 'FLOWMETER-CAL-9921');

-- 42. Insemination Records
INSERT INTO `insemination_records` (`id`, `cow_id`, `date`, `bull_id`, `breed`, `technician_name`, `pregnancy_status`, `expected_calving_date`) VALUES
('ins-001', 'cow-mdu-004', DATE_SUB(NOW(), INTERVAL 90 DAY), 'BULL-JERSEY-MDU-44', 'Jersey', 'Dr. R. Anand BVSc', 'confirmed_pregnant', DATE_ADD(NOW(), INTERVAL 190 DAY));

SET FOREIGN_KEY_CHECKS = 1;
