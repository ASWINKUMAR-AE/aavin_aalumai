-- ==========================================================
-- AAVIN SMART CATTLE PASSPORT - ADD BOOTH OPERATOR USER
-- Run this script in MySQL / phpMyAdmin on `aavin_milkflow`
-- ==========================================================

USE `aavin_milkflow`;

-- 1. Create or ensure Booth role exists
INSERT IGNORE INTO `roles` (`id`, `name`, `display_name`, `description`) 
VALUES ('role-booth', 'booth', 'Booth Staff', 'Manage booth collections, review daily intakes, issue receipts');

-- 2. Insert new Booth Operator User
-- Default password: Password@123
INSERT INTO `users` (`id`, `username`, `email`, `phone`, `password_hash`, `full_name`, `status`, `preferred_language`)
VALUES (
  'usr-booth-02', 
  'booth_muthu', 
  'muthu.booth@aavin.tn.gov.in', 
  '9842000011', 
  '$2b$10$MHG7DzRCdM8t.cg8tcHgWehZyo8s8h/.DFq7s2lXAtje1eirltmjG', 
  'S. Muthu (Booth Officer)', 
  'active', 
  'ta'
)
ON DUPLICATE KEY UPDATE 
  `phone` = VALUES(`phone`),
  `full_name` = VALUES(`full_name`),
  `status` = 'active';

-- 3. Map user to booth role
INSERT IGNORE INTO `user_roles` (`user_id`, `role_id`)
VALUES ('usr-booth-02', 'role-booth');

-- 4. Ensure Booth entity exists
INSERT INTO `booths` (`id`, `code`, `name`, `taluk`, `village`, `district`, `assigned_bmc_id`, `capacity_litres`, `operator_name`, `phone`)
VALUES (
  'booth-mdu-02', 
  'AAVIN-BOOTH-MDU-02', 
  'Navinipatti Village Milk Collection Booth #2', 
  'Melur', 
  'Navinipatti', 
  'Madurai', 
  'bmc-mdu-01', 
  3500.00, 
  'S. Muthu', 
  '9842000011'
)
ON DUPLICATE KEY UPDATE 
  `operator_name` = VALUES(`operator_name`),
  `phone` = VALUES(`phone`);

-- 5. Ensure BMC Booth assignment exists
INSERT IGNORE INTO `bmc_booth_assignments` (`bmc_id`, `booth_id`)
VALUES ('bmc-mdu-01', 'booth-mdu-02');

-- 6. Link farmers to this booth
INSERT IGNORE INTO `farmer_booth_assignments` (`farmer_user_id`, `booth_id`)
VALUES ('usr-farmer-02', 'booth-mdu-02');

-- Verification Query
SELECT u.id, u.username, u.full_name, u.phone, r.name AS role, b.name AS assigned_booth
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN booths b ON b.id = 'booth-mdu-02'
WHERE u.username = 'booth_muthu';
