import { db } from '../config/database.js';

async function seedFullFarmersData() {
  console.log('--- Seeding Comprehensive Demo Data for Farmer 1 (Murugan) & Farmer 2 (Selvi) ---');

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Extra cows for Farmer 1 & Farmer 2
    console.log('1. Populating complete Cattle Passports...');
    await connection.query(`
      INSERT INTO cows (id, tag_number, name, breed, gender, date_of_birth, approximate_age_months, current_owner_user_id, primary_centre_id, health_status, lactation_stage, milking_status, average_daily_yield, photo_url, identification_marks)
      VALUES 
      ('cow-mdu-005', 'TN-MDU-COW-1005', 'Gowri (Jersey Cross)', 'Jersey Cross', 'female', '2022-05-10', 28, 'usr-farmer-01', 'cc-melur-01', 'healthy', 'early', 'lactating', 12.50, 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500', 'Brown muzzle with white chest spot, ear tag #1005'),
      ('cow-mdu-006', 'TN-MDU-COW-1006', 'Kaveri (Gir Cross)', 'Gir Cross', 'female', '2021-09-18', 36, 'usr-farmer-02', 'cc-melur-01', 'healthy', 'mid', 'lactating', 15.00, 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=500', 'Distinct convex forehead and long pendulous ears, tag #1006')
      ON DUPLICATE KEY UPDATE name = VALUES(name), health_status = VALUES(health_status)
    `);

    // 2. QR Tokens
    await connection.query(`
      INSERT INTO cow_qr_tokens (id, cow_id, token) VALUES
      ('qrt-005', 'cow-mdu-005', 'AAVIN_QR_TOKEN_8E2D1F4B9A3C_1005'),
      ('qrt-006', 'cow-mdu-006', 'AAVIN_QR_TOKEN_4B9A3C8E2D1F_1006')
      ON DUPLICATE KEY UPDATE token = VALUES(token)
    `);

    // 3. Vet assignments
    await connection.query(`
      INSERT INTO cow_veterinarian_assignments (id, cow_id, vet_user_id, is_primary, notes) VALUES
      ('cva-005', 'cow-mdu-005', 'usr-vet-01', 1, 'Regular preventive healthcare by Dr. Anand'),
      ('cva-006', 'cow-mdu-006', 'usr-vet-01', 1, 'Assigned to Dr. Anand for periodic dewoming and checkup')
      ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)
    `);

    // 4. On-Farm Milk Production Records for the past 14 days
    console.log('2. Populating 14-day daily milking records (Morning & Evening)...');
    const cowYields = [
      { cowId: 'cow-mdu-001', farmerId: 'usr-farmer-01', mornAvg: 7.8, eveAvg: 6.7 },
      { cowId: 'cow-mdu-002', farmerId: 'usr-farmer-01', mornAvg: 8.5, eveAvg: 7.5 },
      { cowId: 'cow-mdu-005', farmerId: 'usr-farmer-01', mornAvg: 6.5, eveAvg: 5.8 },
      { cowId: 'cow-mdu-003', farmerId: 'usr-farmer-02', mornAvg: 5.4, eveAvg: 4.6 },
      { cowId: 'cow-mdu-004', farmerId: 'usr-farmer-02', mornAvg: 6.8, eveAvg: 6.2 },
      { cowId: 'cow-mdu-006', farmerId: 'usr-farmer-02', mornAvg: 8.0, eveAvg: 7.0 },
    ];

    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      for (const cy of cowYields) {
        // Morning session
        const mornVariance = (Math.sin(dayOffset + cy.mornAvg) * 0.4).toFixed(2);
        const mornYield = (cy.mornAvg + parseFloat(mornVariance)).toFixed(2);
        const mprMornId = `mpr-${cy.cowId}-d${dayOffset}-morn`;
        
        await connection.query(`
          INSERT INTO milk_production_records (id, cow_id, farmer_user_id, session, production_date, quantity_litres, milking_time, cow_condition_notes)
          VALUES (?, ?, ?, 'morning', DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, '05:45:00', 'Clean udder, healthy yield')
          ON DUPLICATE KEY UPDATE quantity_litres = VALUES(quantity_litres)
        `, [mprMornId, cy.cowId, cy.farmerId, dayOffset, mornYield]);

        // Evening session
        const eveVariance = (Math.cos(dayOffset + cy.eveAvg) * 0.35).toFixed(2);
        const eveYield = (cy.eveAvg + parseFloat(eveVariance)).toFixed(2);
        const mprEveId = `mpr-${cy.cowId}-d${dayOffset}-eve`;

        await connection.query(`
          INSERT INTO milk_production_records (id, cow_id, farmer_user_id, session, production_date, quantity_litres, milking_time, cow_condition_notes)
          VALUES (?, ?, ?, 'evening', DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, '17:30:00', 'Normal evening milking')
          ON DUPLICATE KEY UPDATE quantity_litres = VALUES(quantity_litres)
        `, [mprEveId, cy.cowId, cy.farmerId, dayOffset, eveYield]);
      }
    }

    // 5. Daily Feeding Records for past 7 days
    console.log('3. Populating feed and nutrition logs (Co-4 green grass, concentrate, mineral mix)...');
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      for (const cy of cowYields) {
        // Green Fodder
        await connection.query(`
          INSERT INTO feeding_records (id, cow_id, farmer_user_id, feed_type_id, quantity_kg, feeding_time, feeding_date, notes)
          VALUES (?, ?, ?, 'feed-01', 20.00, 'morning', DATE_SUB(CURDATE(), INTERVAL ? DAY), 'Chopped Co-4 Napier grass')
          ON DUPLICATE KEY UPDATE quantity_kg = VALUES(quantity_kg)
        `, [`fr-${cy.cowId}-d${dayOffset}-f1`, cy.cowId, cy.farmerId, dayOffset]);

        // Aavin Pellets & Mineral mix
        await connection.query(`
          INSERT INTO feeding_records (id, cow_id, farmer_user_id, feed_type_id, quantity_kg, feeding_time, feeding_date, notes)
          VALUES (?, ?, ?, 'feed-03', 4.50, 'evening', DATE_SUB(CURDATE(), INTERVAL ? DAY), 'Aavin pellet with 50g chelated mineral mix')
          ON DUPLICATE KEY UPDATE quantity_kg = VALUES(quantity_kg)
        `, [`fr-${cy.cowId}-d${dayOffset}-f3`, cy.cowId, cy.farmerId, dayOffset]);
      }
    }

    // 6. Milk Collection Records with Lab Quality Tests & Safety Twin Decisions (Past 7 Days)
    console.log('4. Populating collection receipts, quality tests, and safety decisions...');
    const collectionSamples = [
      // Day 0 (Today Morning)
      { id: 'col-mdu-101', rcp: 'RCP-MDU-2026-101', farmerId: 'usr-farmer-01', cowId: 'cow-mdu-001', daysAgo: 0, litres: 7.80, fat: 4.35, snf: 8.75, temp: 6.8, decision: 'CLEAR', rate: 38.85, amt: 303.03 },
      { id: 'col-mdu-102', rcp: 'RCP-MDU-2026-102', farmerId: 'usr-farmer-01', cowId: 'cow-mdu-005', daysAgo: 0, litres: 6.50, fat: 4.10, snf: 8.60, temp: 7.0, decision: 'CLEAR', rate: 37.60, amt: 244.40 },
      { id: 'col-mdu-103', rcp: 'RCP-MDU-2026-103', farmerId: 'usr-farmer-02', cowId: 'cow-mdu-003', daysAgo: 0, litres: 5.40, fat: 4.60, snf: 8.90, temp: 6.5, decision: 'CLEAR', rate: 40.20, amt: 217.08 },
      { id: 'col-mdu-104', rcp: 'RCP-MDU-2026-104', farmerId: 'usr-farmer-02', cowId: 'cow-mdu-004', daysAgo: 0, litres: 6.80, fat: 4.20, snf: 8.65, temp: 7.2, decision: 'CLEAR', rate: 38.10, amt: 259.08 },
      { id: 'col-mdu-105', rcp: 'RCP-MDU-2026-105', farmerId: 'usr-farmer-02', cowId: 'cow-mdu-006', daysAgo: 0, litres: 8.00, fat: 4.40, snf: 8.80, temp: 6.9, decision: 'CLEAR', rate: 39.15, amt: 313.20 },
      // Day 1 (Yesterday)
      { id: 'col-mdu-106', rcp: 'RCP-MDU-2026-106', farmerId: 'usr-farmer-01', cowId: 'cow-mdu-001', daysAgo: 1, litres: 7.50, fat: 4.30, snf: 8.70, temp: 7.2, decision: 'CLEAR', rate: 38.50, amt: 288.75 },
      { id: 'col-mdu-107', rcp: 'RCP-MDU-2026-107', farmerId: 'usr-farmer-01', cowId: 'cow-mdu-005', daysAgo: 1, litres: 6.30, fat: 4.05, snf: 8.55, temp: 7.4, decision: 'CLEAR', rate: 37.30, amt: 234.99 },
      { id: 'col-mdu-108', rcp: 'RCP-MDU-2026-108', farmerId: 'usr-farmer-02', cowId: 'cow-mdu-003', daysAgo: 1, litres: 5.20, fat: 4.55, snf: 8.85, temp: 6.7, decision: 'CLEAR', rate: 39.95, amt: 207.74 },
      { id: 'col-mdu-109', rcp: 'RCP-MDU-2026-109', farmerId: 'usr-farmer-02', cowId: 'cow-mdu-004', daysAgo: 1, litres: 6.60, fat: 4.15, snf: 8.60, temp: 7.1, decision: 'CLEAR', rate: 37.85, amt: 249.81 },
      // Day 2
      { id: 'col-mdu-110', rcp: 'RCP-MDU-2026-110', farmerId: 'usr-farmer-01', cowId: 'cow-mdu-001', daysAgo: 2, litres: 7.60, fat: 4.25, snf: 8.65, temp: 7.0, decision: 'CLEAR', rate: 38.25, amt: 290.70 },
      { id: 'col-mdu-111', rcp: 'RCP-MDU-2026-111', farmerId: 'usr-farmer-02', cowId: 'cow-mdu-006', daysAgo: 2, litres: 7.90, fat: 4.35, snf: 8.75, temp: 6.8, decision: 'CLEAR', rate: 38.85, amt: 306.92 },
      // Mastitis Hold Demo (Cow 002 under treatment)
      { id: 'col-mdu-112', rcp: 'RCP-MDU-2026-112', farmerId: 'usr-farmer-01', cowId: 'cow-mdu-002', daysAgo: 0, litres: 8.50, fat: 3.90, snf: 8.50, temp: 7.5, decision: 'HOLD', rate: 0.00, amt: 0.00 },
    ];

    for (const s of collectionSamples) {
      // Collection record
      await connection.query(`
        INSERT INTO milk_collection_records (id, receipt_number, collection_session_id, centre_id, farmer_user_id, cow_id, operator_user_id, quantity_litres, temperature_c, equipment_device_id, calculated_amount_inr, rate_per_litre_applied, payment_status, created_at)
        VALUES (?, ?, 'cs-mdu-today-morn', 'cc-melur-01', ?, ?, 'usr-centre-01', ?, ?, 'EKOMILK-ULTRA-01', ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
        ON DUPLICATE KEY UPDATE quantity_litres = VALUES(quantity_litres), calculated_amount_inr = VALUES(calculated_amount_inr)
      `, [s.id, s.rcp, s.farmerId, s.cowId, s.litres, s.temp, s.amt, s.rate, s.decision === 'HOLD' ? 'held_quarantine' : 'calculated', s.daysAgo]);

      // Quality test
      await connection.query(`
        INSERT INTO milk_quality_tests (id, collection_record_id, analyzer_device_id, fat_percentage, snf_percentage, density_g_cm3, acidity_ph, adulteration_screened, adulteration_detected, threshold_version_id, is_demo_data)
        VALUES (?, ?, 'EKOMILK-ULTRA-01', ?, ?, 1.0285, 6.65, 1, 0, 'qtv-v1', 0)
        ON DUPLICATE KEY UPDATE fat_percentage = VALUES(fat_percentage), snf_percentage = VALUES(snf_percentage)
      `, [`qt-${s.id}`, s.id, s.fat, s.snf]);

      // Safety Decision
      const reason = s.decision === 'CLEAR'
        ? `PASSED: Fat (${s.fat}%) >= 3.50%, SNF (${s.snf}%) >= 8.50%, Temp (${s.temp}C) <= 12C. All Aavin standards approved.`
        : `MANDATORY HOLD: Active veterinary antibiotic withdrawal period in force. Zero payment quarantine hold.`;

      await connection.query(`
        INSERT INTO milk_safety_decisions (id, collection_record_id, decision, primary_reason, decision_details, withdrawal_status, rule_version_id)
        VALUES (?, ?, ?, ?, ?, ?, 'srv-v1')
        ON DUPLICATE KEY UPDATE decision = VALUES(decision), primary_reason = VALUES(primary_reason)
      `, [
        `msd-${s.id}`,
        s.id,
        s.decision,
        reason,
        JSON.stringify({ fat: `${s.fat}%`, snf: `${s.snf}%`, temp: `${s.temp}C`, safety: s.decision }),
        s.decision === 'HOLD' ? 'active_hold' : 'none'
      ]);
    }

    // 7. Clinical Health Records
    console.log('5. Populating clinical health checkups...');
    await connection.query(`
      INSERT INTO cow_health_records (id, cow_id, recorded_by_vet_user_id, examination_date, body_temperature_c, heart_rate_bpm, rumen_motility, body_condition_score, clinical_signs, diagnosis, health_status_assigned, recommendations, next_follow_up_date)
      VALUES
      ('hlth-004', 'cow-mdu-005', 'usr-vet-01', DATE_SUB(NOW(), INTERVAL 4 DAY), 38.6, 66, 'Normal (3/2min)', 3.6, 'Bright mucosal color, good body condition', 'Optimal Health & Lactation', 'healthy', 'Continue regular concentrate pellets and green grass', DATE_ADD(NOW(), INTERVAL 26 DAY)),
      ('hlth-005', 'cow-mdu-006', 'usr-vet-01', DATE_SUB(NOW(), INTERVAL 10 DAY), 38.4, 62, 'Normal (3/2min)', 3.9, 'Gir heritage vigour, robust rumination', 'Healthy High Yield Bovine', 'healthy', 'Maintain fresh water and mineral block access', DATE_ADD(NOW(), INTERVAL 20 DAY))
      ON DUPLICATE KEY UPDATE diagnosis = VALUES(diagnosis)
    `);

    // 8. Vaccination Records with Predictive Boosters
    console.log('6. Populating vaccination records & booster predictions...');
    await connection.query(`
      INSERT INTO vaccination_records (id, cow_id, administered_by_vet_user_id, vaccine_name, batch_number, dose, administration_date, next_booster_due_date, notes)
      VALUES
      ('vac-101', 'cow-mdu-001', 'usr-vet-01', 'FMD Trivalent Oil Adjuvant (Raksha-Ovac)', 'FMD-2026-B89', '2.0 ml s/c', '2026-06-15', '2026-12-15', 'Pre-monsoon biannual booster against O, A, Asia-1 serotypes. Good immune response.'),
      ('vac-102', 'cow-mdu-001', 'usr-vet-01', 'Anthrax Spore Vaccine (Live)', 'ANT-2026-X12', '1.0 ml s/c', '2026-03-10', '2027-03-10', 'Annual endemic zone prophylaxis. No adverse site reaction.'),
      ('vac-103', 'cow-mdu-002', 'usr-vet-01', 'Hemorrhagic Septicemia & Black Quarter (Raksha-HS+BQ)', 'HSBQ-2026-C44', '3.0 ml s/c', '2026-05-20', '2026-11-20', 'Combined dual antigen booster. Recommended annual revaccination.'),
      ('vac-104', 'cow-mdu-003', 'usr-vet-01', 'Brucellosis S19 Immuno-Guard', 'BRU-2026-K09', '2.0 ml s/c', '2026-02-12', '2027-02-12', 'Dairy herd reproductive protection.'),
      ('vac-105', 'cow-mdu-004', 'usr-vet-01', 'FMD Trivalent Oil Adjuvant Booster (Raksha-Ovac)', 'FMD-2026-A18', '2.0 ml s/c', '2026-04-18', '2026-10-18', '⚠️ Booster due in 8 days. Scheduled for upcoming village veterinary camp.'),
      ('vac-106', 'cow-mdu-005', 'usr-vet-01', 'FMD Trivalent Oil Adjuvant (Raksha-Ovac)', 'FMD-2026-C01', '2.0 ml s/c', '2026-07-05', '2027-01-05', 'Biannual booster administered at Melur Sub-centre.'),
      ('vac-107', 'cow-mdu-006', 'usr-vet-01', 'Anthrax Spore Vaccine (Live)', 'ANT-2026-Z88', '1.0 ml s/c', '2026-08-10', '2027-08-10', 'Routine annual booster for Kaveri.')
      ON DUPLICATE KEY UPDATE vaccine_name = VALUES(vaccine_name), next_booster_due_date = VALUES(next_booster_due_date)
    `);

    // 9. Payment Cycle Transactions & Ledgers (Fortnightly)
    console.log('7. Populating Fortnightly payment transactions & ledgers...');
    await connection.query(`
      INSERT INTO payment_transactions (id, transaction_reference, payment_cycle_id, farmer_user_id, total_litres, gross_amount_inr, deductions_inr, net_payable_inr, status, bank_reference_number, payment_date)
      VALUES
      ('tx-mdu-101', 'TXN-AAVIN-2026-F1-101', 'cyc-2026-apr-1', 'usr-farmer-01', 215.50, 8345.50, 0.00, 8345.50, 'approved', 'NEFT-AAVIN-MDU-998811', DATE_SUB(NOW(), INTERVAL 2 DAY)),
      ('tx-mdu-102', 'TXN-AAVIN-2026-F1-102', 'cyc-2026-apr-1', 'usr-farmer-02', 198.00, 7751.70, 0.00, 7751.70, 'approved', 'NEFT-AAVIN-MDU-998822', DATE_SUB(NOW(), INTERVAL 2 DAY))
      ON DUPLICATE KEY UPDATE net_payable_inr = VALUES(net_payable_inr), status = VALUES(status)
    `);

    // 10. Notifications for Farmers
    console.log('8. Populating user notifications...');
    await connection.query(`
      INSERT INTO notifications (id, user_id, title, body, category, related_entity_type, related_entity_id, is_read)
      VALUES
      ('notif-101', 'usr-farmer-01', 'Milk Collection Receipt Generated', '7.80L collected today morning at Melur CC. Status: CLEAR (Fat: 4.35%, SNF: 8.75%). Amount: Rs. 303.03.', 'collection_receipt', 'collection', 'col-mdu-101', 0),
      ('notif-102', 'usr-farmer-01', 'Fortnight Payment Credited', 'Rs. 8,345.50 credited to your Canara Bank account via NEFT (Ref: NEFT-AAVIN-MDU-998811).', 'payment_disbursed', 'payment', 'tx-mdu-101', 0),
      ('notif-103', 'usr-farmer-02', 'Milk Collection Receipt Generated', '8.00L collected today morning at Melur CC. Status: CLEAR (Fat: 4.40%, SNF: 8.80%). Amount: Rs. 313.20.', 'collection_receipt', 'collection', 'col-mdu-105', 0),
      ('notif-104', 'usr-farmer-02', 'Fortnight Payment Credited', 'Rs. 7,751.70 credited to your SBI account via NEFT (Ref: NEFT-AAVIN-MDU-998822).', 'payment_disbursed', 'payment', 'tx-mdu-102', 0)
      ON DUPLICATE KEY UPDATE title = VALUES(title)
    `);

    await connection.commit();
    console.log('✅ Full Demo Data Successfully Seeded for Farmer Murugan & Farmer Selvi!');
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

seedFullFarmersData().catch(console.error);
