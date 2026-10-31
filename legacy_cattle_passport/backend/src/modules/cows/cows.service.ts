import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

export class CowsService {
  static async listCows(filters: { ownerId?: string; centreId?: string; search?: string }) {
    let sql = `
      SELECT c.*,
             u.full_name as owner_name, u.phone as owner_phone,
             cc.name as centre_name,
             (SELECT token FROM cow_qr_tokens WHERE cow_id = c.id AND is_revoked = 0 ORDER BY created_at DESC LIMIT 1) as qr_token,
             (SELECT wr.status FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as active_withdrawal_status,
             (SELECT wr.restriction_end FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as withdrawal_end_time,
             (SELECT u2.full_name FROM cow_veterinarian_assignments cva JOIN users u2 ON cva.vet_user_id = u2.id WHERE cva.cow_id = c.id AND cva.is_primary = 1 LIMIT 1) as assigned_vet_name
      FROM cows c
      JOIN users u ON c.current_owner_user_id = u.id
      LEFT JOIN collection_centres cc ON c.primary_centre_id = cc.id
      WHERE c.is_active = 1
    `;
    const params: any[] = [];

    if (filters.ownerId) {
      sql += ` AND c.current_owner_user_id = ?`;
      params.push(filters.ownerId);
    }
    if (filters.centreId) {
      sql += ` AND c.primary_centre_id = ?`;
      params.push(filters.centreId);
    }
    if (filters.search) {
      sql += ` AND (c.name LIKE ? OR c.tag_number LIKE ? OR u.full_name LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ` ORDER BY c.created_at DESC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async createCow(ownerId: string, data: any) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Check unique tag
      const [existing] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM cows WHERE tag_number = ?`,
        [data.tagNumber]
      );
      if (existing.length > 0) {
        throw new Error(`A cattle with tag number ${data.tagNumber} already exists`);
      }

      // If primaryCentreId not provided, fetch from farmer profile
      let centreId = data.primaryCentreId;
      if (!centreId) {
        const [farmer] = await connection.query<RowDataPacket[]>(
          `SELECT primary_centre_id FROM farmer_profiles WHERE user_id = ?`,
          [ownerId]
        );
        centreId = farmer.length > 0 ? farmer[0].primary_centre_id : null;
      }

      const cowId = uuidv4();
      await connection.query(
        `INSERT INTO cows (id, tag_number, name, breed, gender, date_of_birth, approximate_age_months,
                           current_owner_user_id, primary_centre_id, health_status, lactation_stage,
                           milking_status, average_daily_yield, photo_url, identification_marks,
                           somatic_cell_count, insemination_status, last_calving_date, last_deworming_date,
                           vaccination_status, daily_concentrate_kg, daily_green_fodder_kg, mineral_mixture_grams, milk_safety_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cowId,
          data.tagNumber,
          data.name,
          data.breed || 'Jersey Cross',
          data.gender || 'female',
          data.dateOfBirth || null,
          data.approximateAgeMonths || null,
          ownerId,
          centreId,
          data.lactationStage || 'peak',
          data.milkingStatus || 'lactating',
          data.averageDailyYield || 10.0,
          data.photoUrl || null,
          data.identificationMarks || null,
          data.somaticCellCount || 145000,
          data.inseminationStatus || 'not_bred',
          data.lastCalvingDate || null,
          data.lastDewormingDate || null,
          data.vaccinationStatus || 'up_to_date',
          data.dailyConcentrateKg !== undefined ? data.dailyConcentrateKg : 4.0,
          data.dailyGreenFodderKg !== undefined ? data.dailyGreenFodderKg : 25.0,
          data.mineralMixtureGrams !== undefined ? data.mineralMixtureGrams : 50,
          data.milkSafetyIndex !== undefined ? data.milkSafetyIndex : 98,
        ]
      );

      // Generate opaque secure QR lookup token
      const qrTokenId = uuidv4();
      const rawToken = `AAVIN_QR_TOKEN_${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}_${data.tagNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
      await connection.query(
        `INSERT INTO cow_qr_tokens (id, cow_id, token) VALUES (?, ?, ?)`,
        [qrTokenId, cowId, rawToken]
      );

      // Automatically assign default vet for zone if available
      const [vets] = await connection.query<RowDataPacket[]>(
        `SELECT user_id FROM veterinary_profiles LIMIT 1`
      );
      if (vets.length > 0) {
        await connection.query(
          `INSERT INTO cow_veterinarian_assignments (id, cow_id, vet_user_id, is_primary)
           VALUES (?, ?, ?, 1)`,
          [uuidv4(), cowId, vets[0].user_id]
        );
      }

      await connection.commit();

      return this.getCowById(cowId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async getCowById(cowId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT c.*,
              u.id as owner_id, u.full_name as owner_name, u.phone as owner_phone,
              fp.farmer_id_code, fp.village as owner_village,
              cc.name as centre_name, cc.centre_code,
              (SELECT token FROM cow_qr_tokens WHERE cow_id = c.id AND is_revoked = 0 ORDER BY created_at DESC LIMIT 1) as qr_token,
              (SELECT wr.status FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as active_withdrawal_status,
              (SELECT wr.restriction_end FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as withdrawal_end_time,
              (SELECT wr.reason FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as withdrawal_reason,
              (SELECT u2.full_name FROM cow_veterinarian_assignments cva JOIN users u2 ON cva.vet_user_id = u2.id WHERE cva.cow_id = c.id AND cva.is_primary = 1 LIMIT 1) as assigned_vet_name,
              (SELECT u2.phone FROM cow_veterinarian_assignments cva JOIN users u2 ON cva.vet_user_id = u2.id WHERE cva.cow_id = c.id AND cva.is_primary = 1 LIMIT 1) as assigned_vet_phone
       FROM cows c
       JOIN users u ON c.current_owner_user_id = u.id
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN collection_centres cc ON c.primary_centre_id = cc.id
       WHERE c.id = ?`,
      [cowId]
    );

    if (!rows.length) return null;
    return rows[0];
  }

  static async lookupCowByIdentifier(identifier: string) {
    // Identifier can be either cow ID, tag number, or opaque QR token
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT c.*,
              u.id as owner_id, u.full_name as owner_name, u.phone as owner_phone,
              fp.farmer_id_code, fp.village as owner_village,
              cc.id as centre_id, cc.name as centre_name, cc.centre_code,
              qt.token as qr_token,
              (SELECT wr.status FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as active_withdrawal_status,
              (SELECT wr.restriction_end FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as withdrawal_end_time,
              (SELECT wr.reason FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as withdrawal_reason,
              (SELECT u2.full_name FROM cow_veterinarian_assignments cva JOIN users u2 ON cva.vet_user_id = u2.id WHERE cva.cow_id = c.id AND cva.is_primary = 1 LIMIT 1) as assigned_vet_name
       FROM cows c
       JOIN users u ON c.current_owner_user_id = u.id
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN collection_centres cc ON c.primary_centre_id = cc.id
       LEFT JOIN cow_qr_tokens qt ON c.id = qt.cow_id AND qt.is_revoked = 0
       WHERE c.id = ? OR c.tag_number = ? OR qt.token = ?
       LIMIT 1`,
      [identifier, identifier, identifier]
    );

    if (!rows.length) return null;
    return rows[0];
  }

  static async getDigitalPassport(cowId: string) {
    const cow = await this.getCowById(cowId);
    if (!cow) return null;

    // Health history
    const [healthRecords] = await db.query<RowDataPacket[]>(
      `SELECT chr.*, u.full_name as vet_name
       FROM cow_health_records chr
       JOIN users u ON chr.recorded_by_vet_user_id = u.id
       WHERE chr.cow_id = ?
       ORDER BY chr.examination_date DESC LIMIT 10`,
      [cowId]
    );

    // Treatments & active withdrawals
    const [treatments] = await db.query<RowDataPacket[]>(
      `SELECT tr.*, mc.brand_name, mc.generic_name, u.full_name as vet_name
       FROM treatment_records tr
       LEFT JOIN medicine_catalog mc ON tr.medicine_id = mc.id
       JOIN users u ON tr.vet_user_id = u.id
       WHERE tr.cow_id = ?
       ORDER BY tr.treatment_start_date DESC LIMIT 10`,
      [cowId]
    );

    // Vaccinations
    const [vaccinations] = await db.query<RowDataPacket[]>(
      `SELECT vr.*, u.full_name as vet_name
       FROM vaccination_records vr
       JOIN users u ON vr.administered_by_vet_user_id = u.id
       WHERE vr.cow_id = ?
       ORDER BY vr.administration_date DESC LIMIT 10`,
      [cowId]
    );

    // Recent milk production
    const [production] = await db.query<RowDataPacket[]>(
      `SELECT * FROM milk_production_records WHERE cow_id = ? ORDER BY production_date DESC, session DESC LIMIT 14`,
      [cowId]
    );

    // Recent collections & quality tests
    const [collections] = await db.query<RowDataPacket[]>(
      `SELECT mcr.*, msd.decision, msd.primary_reason, mqt.fat_percentage, mqt.snf_percentage, mqt.adulteration_detected
       FROM milk_collection_records mcr
       LEFT JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
       LEFT JOIN milk_quality_tests mqt ON mcr.id = mqt.collection_record_id
       WHERE mcr.cow_id = ?
       ORDER BY mcr.collection_time DESC LIMIT 10`,
      [cowId]
    );

    return {
      cow,
      healthRecords,
      treatments,
      vaccinations,
      production,
      collections,
    };
  }

  static async getPortalAllTags() {
    const [farmers] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.full_name, u.phone, fp.farmer_id_code, fp.village, fp.taluk, fp.primary_centre_id, cc.name as centre_name
       FROM users u
       JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN collection_centres cc ON fp.primary_centre_id = cc.id
       ORDER BY u.full_name ASC`
    );

    const result = [];
    for (const farmer of farmers) {
      const cows = await this.listCows({ ownerId: farmer.id });
      result.push({
        ...farmer,
        cows,
      });
    }
    return result;
  }

  static async getPortalSummary() {
    // Recent collections with tests and decisions
    const [recentCollections] = await db.query<RowDataPacket[]>(
      `SELECT mcr.id, mcr.collection_time, COALESCE(cs.session_type, 'morning') as session, mcr.quantity_litres, mcr.rate_per_litre_applied as rate_per_litre_inr, mcr.calculated_amount_inr,
              u.full_name as farmer_name, fp.farmer_id_code, fp.village,
              c.name as cow_name, c.tag_number,
              msd.decision, msd.primary_reason,
              mqt.fat_percentage, mqt.snf_percentage, mqt.density_g_cm3, mqt.adulteration_detected
       FROM milk_collection_records mcr
       LEFT JOIN collection_sessions cs ON mcr.collection_session_id = cs.id
       JOIN users u ON mcr.farmer_user_id = u.id
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       JOIN cows c ON mcr.cow_id = c.id
       LEFT JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
       LEFT JOIN milk_quality_tests mqt ON mcr.id = mqt.collection_record_id
       ORDER BY mcr.collection_time DESC LIMIT 20`
    );



    // Active withdrawal quarantine board
    const [quarantineBoard] = await db.query<RowDataPacket[]>(
      `SELECT wr.*, c.name as cow_name, c.tag_number, c.breed,
              u.full_name as farmer_name, u.phone as farmer_phone, fp.village,
              u2.full_name as vet_name,
              mc.brand_name as medicine_brand, mc.generic_name as medicine_generic,
              TIMESTAMPDIFF(HOUR, UTC_TIMESTAMP(), wr.restriction_end) as hours_remaining
       FROM withdrawal_restrictions wr
       JOIN cows c ON wr.cow_id = c.id
       JOIN users u ON c.current_owner_user_id = u.id
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN treatment_records tr ON wr.treatment_id = tr.id
       LEFT JOIN users u2 ON tr.vet_user_id = u2.id
       LEFT JOIN medicine_catalog mc ON tr.medicine_id = mc.id
       WHERE wr.status = 'active'
       ORDER BY wr.restriction_end ASC`
    );


    // Recent payment transactions
    const [recentPayments] = await db.query<RowDataPacket[]>(
      `SELECT pt.*, u.full_name as farmer_name, fp.farmer_id_code, fp.village, fp.bank_account_number, fp.bank_ifsc
       FROM payment_transactions pt
       JOIN users u ON pt.farmer_user_id = u.id
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       ORDER BY pt.created_at DESC LIMIT 10`
    );


    return {
      recentCollections,
      quarantineBoard,
      recentPayments,
    };
  }

  static async createPortalTag(data: {
    ownerId: string;
    tagNumber: string;
    name: string;
    breed: string;
    averageDailyYield?: number;
    healthStatus?: string;
    inseminationStatus?: string;
    somaticCellCount?: number;
    dailyGreenFodderKg?: number;
    dailyConcentrateKg?: number;
    mineralMixtureGrams?: number;
    lastDewormingDate?: string;
    vaccinationStatus?: string;
  }) {
    return this.createCow(data.ownerId, {
      tagNumber: data.tagNumber,
      name: data.name,
      breed: data.breed,
      averageDailyYield: data.averageDailyYield || 12.0,
      healthStatus: data.healthStatus || 'healthy',
      milkingStatus: 'lactating',
      lactationStage: 'peak',
      gender: 'female',
      inseminationStatus: data.inseminationStatus || 'not_bred',
      somaticCellCount: data.somaticCellCount || 145000,
      dailyGreenFodderKg: data.dailyGreenFodderKg || 25.0,
      dailyConcentrateKg: data.dailyConcentrateKg || 4.0,
      mineralMixtureGrams: data.mineralMixtureGrams || 50,
      lastDewormingDate: data.lastDewormingDate || '2026-09-10',
      vaccinationStatus: data.vaccinationStatus || 'up_to_date',
    });
  }

  static async updateCow(cowId: string, data: any, actorUserId?: string) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [existingRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM cows WHERE id = ?`,
        [cowId]
      );
      if (existingRows.length === 0) {
        throw new Error('Cow record not found with ID: ' + cowId);
      }
      const existing = existingRows[0];

      // Check unique tag number if being changed
      const newTag = data.tagNumber !== undefined ? data.tagNumber : data.tag_number;
      if (newTag && newTag !== existing.tag_number) {
        const [tagCheck] = await connection.query<RowDataPacket[]>(
          `SELECT id FROM cows WHERE tag_number = ? AND id != ?`,
          [newTag, cowId]
        );
        if (tagCheck.length > 0) {
          throw new Error(`A cattle with tag number ${newTag} already exists`);
        }
      }

      // If owner changed, record owner transfer audit
      const newOwner = data.currentOwnerUserId !== undefined
        ? data.currentOwnerUserId
        : (data.current_owner_user_id !== undefined ? data.current_owner_user_id : data.ownerId);

      if (newOwner && newOwner !== existing.current_owner_user_id) {
        await connection.query(
          `INSERT INTO cow_owner_history (id, cow_id, previous_owner_user_id, new_owner_user_id, transfer_date, transfer_reason, transferred_by_user_id)
           VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?, ?)`,
          [
            uuidv4(),
            cowId,
            existing.current_owner_user_id,
            newOwner,
            data.transferReason || 'Ownership updated by veterinary officer / authorized user',
            actorUserId || existing.current_owner_user_id,
          ]
        );
      }

      // Prepare fields to update
      const fields: { col: string; val: any }[] = [];
      const mapField = (col: string, ...keys: string[]) => {
        for (const k of keys) {
          if (data[k] !== undefined) {
            fields.push({ col, val: data[k] });
            return;
          }
        }
      };

      mapField('tag_number', 'tagNumber', 'tag_number');
      mapField('name', 'name');
      mapField('breed', 'breed');
      mapField('gender', 'gender');
      mapField('date_of_birth', 'dateOfBirth', 'date_of_birth');
      mapField('approximate_age_months', 'approximateAgeMonths', 'approximate_age_months');
      mapField('current_owner_user_id', 'currentOwnerUserId', 'current_owner_user_id', 'ownerId');
      mapField('primary_centre_id', 'primaryCentreId', 'primary_centre_id');
      mapField('health_status', 'healthStatus', 'health_status');
      mapField('lactation_stage', 'lactationStage', 'lactation_stage');
      mapField('milking_status', 'milkingStatus', 'milking_status');
      mapField('average_daily_yield', 'averageDailyYield', 'average_daily_yield');
      mapField('photo_url', 'photoUrl', 'photo_url');
      mapField('identification_marks', 'identificationMarks', 'identification_marks');
      mapField('somatic_cell_count', 'somaticCellCount', 'somatic_cell_count');
      mapField('insemination_status', 'inseminationStatus', 'insemination_status');
      mapField('last_calving_date', 'lastCalvingDate', 'last_calving_date');
      mapField('last_deworming_date', 'lastDewormingDate', 'last_deworming_date');
      mapField('vaccination_status', 'vaccinationStatus', 'vaccination_status');
      mapField('daily_concentrate_kg', 'dailyConcentrateKg', 'daily_concentrate_kg');
      mapField('daily_green_fodder_kg', 'dailyGreenFodderKg', 'daily_green_fodder_kg');
      mapField('mineral_mixture_grams', 'mineralMixtureGrams', 'mineral_mixture_grams');
      mapField('milk_safety_index', 'milkSafetyIndex', 'milk_safety_index');

      if (data.isActive !== undefined || data.is_active !== undefined) {
        fields.push({ col: 'is_active', val: data.isActive !== undefined ? (data.isActive ? 1 : 0) : (data.is_active ? 1 : 0) });
      }

      if (fields.length > 0) {
        const setClauses = fields.map((f) => `\`${f.col}\` = ?`).join(', ');
        const values = fields.map((f) => f.val);
        values.push(cowId);
        await connection.query(`UPDATE cows SET ${setClauses} WHERE id = ?`, values);
      }

      await connection.commit();
      return await this.getCowById(cowId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}


