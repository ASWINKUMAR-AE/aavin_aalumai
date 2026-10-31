import { db } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket } from 'mysql2';

async function seedVaccinations() {
  console.log('--- Seeding Comprehensive Vaccination History & Booster Predictions ---');
  
  // Get vet user ID
  const [vets] = await db.query<RowDataPacket[]>('SELECT user_id FROM veterinary_profiles LIMIT 1');
  const vetUserId = vets.length > 0 ? vets[0].user_id : 'usr-vet-01';

  // Get all cows
  const [cows] = await db.query<RowDataPacket[]>('SELECT id, tag_number, name FROM cows');

  const cowVaccineMap: Record<string, Array<{
    name: string;
    batch: string;
    dose: string;
    adminDate: string;
    nextDue: string;
    notes: string;
  }>> = {
    'TN-MDU-COW-1001': [
      {
        name: 'FMD Trivalent Oil Adjuvant (Raksha-Ovac)',
        batch: 'FMD-2026-B89',
        dose: '2.0 ml s/c',
        adminDate: '2026-06-15',
        nextDue: '2026-12-15',
        notes: 'Pre-monsoon biannual booster against O, A, Asia-1 serotypes. Good immune response.',
      },
      {
        name: 'Anthrax Spore Vaccine (Live)',
        batch: 'ANT-2026-X12',
        dose: '1.0 ml s/c',
        adminDate: '2026-03-10',
        nextDue: '2027-03-10',
        notes: 'Annual endemic zone prophylaxis. No adverse site reaction.',
      },
    ],
    'TN-MDU-COW-1002': [
      {
        name: 'Hemorrhagic Septicemia & Black Quarter (Raksha-HS+BQ)',
        batch: 'HSBQ-2026-C44',
        dose: '3.0 ml s/c',
        adminDate: '2026-05-20',
        nextDue: '2026-11-20',
        notes: 'Combined dual antigen booster. Recommended annual revaccination.',
      },
      {
        name: 'FMD Trivalent Booster',
        batch: 'FMD-2026-A31',
        dose: '2.0 ml s/c',
        adminDate: '2026-01-15',
        nextDue: '2026-07-15',
        notes: 'Biannual immunization completed.',
      },
    ],
    'TN-MDU-COW-1003': [
      {
        name: 'Brucellosis S19 Calfhood / Adult Immuno-Guard',
        batch: 'BRU-2026-K09',
        dose: '2.0 ml s/c',
        adminDate: '2026-02-12',
        nextDue: '2027-02-12',
        notes: 'Dairy herd reproductive protection. Seronegative confirmed prior to shot.',
      },
      {
        name: 'FMD Trivalent Oil Adjuvant Booster',
        batch: 'FMD-2026-B92',
        dose: '2.0 ml s/c',
        adminDate: '2026-06-25',
        nextDue: '2026-12-25',
        notes: 'Biannual scheduled vaccination campaign at Navinipatti Society.',
      },
    ],
    'TN-MDU-COW-1004': [
      {
        name: 'FMD Trivalent Oil Adjuvant Booster (Raksha-Ovac)',
        batch: 'FMD-2026-A18',
        dose: '2.0 ml s/c',
        adminDate: '2026-04-18',
        nextDue: '2026-10-18',
        notes: '⚠️ Booster due in 8 days. Scheduled for upcoming village veterinary camp.',
      },
      {
        name: 'Theileriosis (Raksha-Vac)',
        batch: 'THE-2025-V77',
        dose: '3.0 ml s/c',
        adminDate: '2025-10-10',
        nextDue: '2028-10-10',
        notes: 'Long-term tick-borne immunity protection.',
      },
    ],
    'TN-MDU-COW-1005': [
      {
        name: 'FMD Trivalent Oil Adjuvant (Raksha-Ovac)',
        batch: 'FMD-2026-C01',
        dose: '2.0 ml s/c',
        adminDate: '2026-07-05',
        nextDue: '2027-01-05',
        notes: 'Biannual booster administered at Melur Sub-centre.',
      },
      {
        name: 'Hemorrhagic Septicemia (HS Alum Precipitated)',
        batch: 'HS-2026-M41',
        dose: '2.5 ml s/c',
        adminDate: '2026-04-02',
        nextDue: '2027-04-02',
        notes: 'Pre-monsoon prophylaxis against Pasteurella multocida.',
      },
    ],
    'TN-MDU-COW-1006': [
      {
        name: 'Anthrax Spore Vaccine (Live)',
        batch: 'ANT-2026-Z88',
        dose: '1.0 ml s/c',
        adminDate: '2026-08-10',
        nextDue: '2027-08-10',
        notes: 'Routine annual booster for Kaveri. Normal recovery.',
      },
      {
        name: 'FMD Trivalent Oil Adjuvant Booster',
        batch: 'FMD-2026-C15',
        dose: '2.0 ml s/c',
        adminDate: '2026-08-10',
        nextDue: '2027-02-10',
        notes: 'Scheduled dual shot administration.',
      },
    ],
  };

  for (const cow of cows) {
    const list = cowVaccineMap[cow.tag_number];
    if (list && list.length > 0) {
      // Clear existing to prevent duplicate clutter
      await db.query('DELETE FROM vaccination_records WHERE cow_id = ?', [cow.id]);

      for (const v of list) {
        await db.query(
          `INSERT INTO vaccination_records (id, cow_id, administered_by_vet_user_id, vaccine_name, batch_number, dose, administration_date, next_booster_due_date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), cow.id, vetUserId, v.name, v.batch, v.dose, v.adminDate, v.nextDue, v.notes]
        );
      }
      console.log(`✅ Seeded ${list.length} vaccinations for ${cow.name} (${cow.tag_number})`);
    }
  }

  console.log('🎉 Vaccination database seed completed successfully!');
  process.exit(0);
}

seedVaccinations().catch(err => {
  console.error('Error seeding vaccinations:', err);
  process.exit(1);
});
