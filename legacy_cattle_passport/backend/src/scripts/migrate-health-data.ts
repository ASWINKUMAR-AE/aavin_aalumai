import { db } from '../config/database.js';

async function migrate() {
  console.log('--- Checking & adding extra cattle health columns in MySQL ---');
  
  const cowCols = [
    { name: 'somatic_cell_count', sql: 'ALTER TABLE cows ADD COLUMN somatic_cell_count INT NULL DEFAULT 145000' },
    { name: 'insemination_status', sql: "ALTER TABLE cows ADD COLUMN insemination_status VARCHAR(50) NOT NULL DEFAULT 'confirmed_pregnant'" },
    { name: 'last_calving_date', sql: 'ALTER TABLE cows ADD COLUMN last_calving_date DATE NULL' },
    { name: 'last_deworming_date', sql: 'ALTER TABLE cows ADD COLUMN last_deworming_date DATE NULL' },
    { name: 'vaccination_status', sql: "ALTER TABLE cows ADD COLUMN vaccination_status VARCHAR(50) NOT NULL DEFAULT 'up_to_date'" },
    { name: 'daily_concentrate_kg', sql: 'ALTER TABLE cows ADD COLUMN daily_concentrate_kg DECIMAL(4,1) NOT NULL DEFAULT 4.5' },
    { name: 'daily_green_fodder_kg', sql: 'ALTER TABLE cows ADD COLUMN daily_green_fodder_kg DECIMAL(4,1) NOT NULL DEFAULT 25.0' },
    { name: 'mineral_mixture_grams', sql: 'ALTER TABLE cows ADD COLUMN mineral_mixture_grams INT NOT NULL DEFAULT 50' },
    { name: 'milk_safety_index', sql: 'ALTER TABLE cows ADD COLUMN milk_safety_index INT NOT NULL DEFAULT 98' },
  ];

  for (const c of cowCols) {
    try {
      await db.query(c.sql);
      console.log('Added column to cows:', c.name);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists in cows:', c.name);
      } else {
        console.error('Error adding column', c.name, e.message);
      }
    }
  }

  const healthCols = [
    { name: 'respiration_rate_bpm', sql: 'ALTER TABLE cow_health_records ADD COLUMN respiration_rate_bpm INT NULL DEFAULT 26' },
    { name: 'udder_quarter_status', sql: "ALTER TABLE cow_health_records ADD COLUMN udder_quarter_status VARCHAR(100) NULL DEFAULT 'RF: Clear | RR: Clear | LF: Clear | LR: Clear'" },
    { name: 'scc_reading', sql: 'ALTER TABLE cow_health_records ADD COLUMN scc_reading INT NULL DEFAULT 140000' }
  ];

  for (const c of healthCols) {
    try {
      await db.query(c.sql);
      console.log('Added column to cow_health_records:', c.name);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists in cow_health_records:', c.name);
      } else {
        console.error('Error adding column', c.name, e.message);
      }
    }
  }

  const prodCols = [
    { name: 'fat_percentage', sql: 'ALTER TABLE milk_production_records ADD COLUMN fat_percentage DECIMAL(4,2) NULL DEFAULT 4.25' },
    { name: 'snf_percentage', sql: 'ALTER TABLE milk_production_records ADD COLUMN snf_percentage DECIMAL(4,2) NULL DEFAULT 8.65' },
    { name: 'milking_temperature_c', sql: 'ALTER TABLE milk_production_records ADD COLUMN milking_temperature_c DECIMAL(4,1) NULL DEFAULT 36.8' },
    { name: 'teat_dip_applied', sql: 'ALTER TABLE milk_production_records ADD COLUMN teat_dip_applied TINYINT(1) NOT NULL DEFAULT 1' }
  ];

  for (const c of prodCols) {
    try {
      await db.query(c.sql);
      console.log('Added column to milk_production_records:', c.name);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists in milk_production_records:', c.name);
      } else {
        console.error('Error adding column', c.name, e.message);
      }
    }
  }

  // Populate realistic data for all 6 demo cows
  await db.query("UPDATE cows SET somatic_cell_count = 135000, insemination_status = 'confirmed_pregnant', last_calving_date = '2025-11-10', last_deworming_date = '2026-08-15', vaccination_status = 'up_to_date', daily_concentrate_kg = 5.0, daily_green_fodder_kg = 28.0, mineral_mixture_grams = 60, milk_safety_index = 99 WHERE tag_number = 'TN-MDU-COW-1001'");
  await db.query("UPDATE cows SET somatic_cell_count = 480000, insemination_status = 'inseminated', last_calving_date = '2025-08-20', last_deworming_date = '2026-07-10', vaccination_status = 'up_to_date', daily_concentrate_kg = 4.0, daily_green_fodder_kg = 22.0, mineral_mixture_grams = 50, milk_safety_index = 45 WHERE tag_number = 'TN-MDU-COW-1002'");
  await db.query("UPDATE cows SET somatic_cell_count = 110000, insemination_status = 'not_bred', last_calving_date = '2026-01-14', last_deworming_date = '2026-09-01', vaccination_status = 'up_to_date', daily_concentrate_kg = 3.5, daily_green_fodder_kg = 20.0, mineral_mixture_grams = 50, milk_safety_index = 100 WHERE tag_number = 'TN-MDU-COW-1003'");
  await db.query("UPDATE cows SET somatic_cell_count = 140000, insemination_status = 'confirmed_pregnant', last_calving_date = '2025-10-05', last_deworming_date = '2026-08-20', vaccination_status = 'up_to_date', daily_concentrate_kg = 4.5, daily_green_fodder_kg = 25.0, mineral_mixture_grams = 50, milk_safety_index = 98 WHERE tag_number = 'TN-MDU-COW-1004'");
  await db.query("UPDATE cows SET somatic_cell_count = 125000, insemination_status = 'inseminated', last_calving_date = '2026-02-18', last_deworming_date = '2026-09-10', vaccination_status = 'up_to_date', daily_concentrate_kg = 4.5, daily_green_fodder_kg = 26.0, mineral_mixture_grams = 50, milk_safety_index = 97 WHERE tag_number = 'TN-MDU-COW-1005'");
  await db.query("UPDATE cows SET somatic_cell_count = 130000, insemination_status = 'confirmed_pregnant', last_calving_date = '2025-12-01', last_deworming_date = '2026-08-05', vaccination_status = 'up_to_date', daily_concentrate_kg = 5.0, daily_green_fodder_kg = 27.0, mineral_mixture_grams = 55, milk_safety_index = 99 WHERE tag_number = 'TN-MDU-COW-1006'");

  console.log('✅ Cattle Health & Milk Company fields successfully updated in MySQL!');
  process.exit(0);
}

migrate().catch(console.error);
