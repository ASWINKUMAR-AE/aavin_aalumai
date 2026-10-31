import { db } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

export class FarmersService {
  static async getFarmerProfile(userId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.full_name, u.phone, u.email, u.preferred_language,
              fp.farmer_id_code, fp.village, fp.taluk, fp.bank_account_name, fp.bank_name,
              fp.bank_account_number, fp.bank_ifsc, fp.upi_id, fp.primary_centre_id,
              cc.name as centre_name, cc.centre_code
       FROM users u
       JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN collection_centres cc ON fp.primary_centre_id = cc.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!rows.length) return null;
    return rows[0];
  }

  static async updateFarmerProfile(userId: string, data: any) {
    // Check if farmer profile exists or create if missing
    const [existingProfile] = await db.query<RowDataPacket[]>(
      `SELECT user_id FROM farmer_profiles WHERE user_id = ?`,
      [userId]
    );

    const village = data.village !== undefined ? data.village : null;
    const taluk = data.taluk !== undefined ? data.taluk : (data.community !== undefined ? data.community : null);
    const farmerIdCode = data.farmerIdCode !== undefined ? data.farmerIdCode : (data.farmer_id_code !== undefined ? data.farmer_id_code : null);
    const bankAccountName = data.bankAccountName !== undefined ? data.bankAccountName : (data.bank_account_name !== undefined ? data.bank_account_name : null);
    const bankName = data.bankName !== undefined ? data.bankName : (data.bank_name !== undefined ? data.bank_name : null);
    const bankAccountNumber = data.bankAccountNumber !== undefined ? data.bankAccountNumber : (data.bank_account_number !== undefined ? data.bank_account_number : null);
    const bankIfsc = data.bankIfsc !== undefined ? data.bankIfsc : (data.bank_ifsc !== undefined ? data.bank_ifsc : null);
    const upiId = data.upiId !== undefined ? data.upiId : (data.upi_id !== undefined ? data.upi_id : null);
    const primaryCentreId = data.primaryCentreId !== undefined ? data.primaryCentreId : (data.assignedBoothId !== undefined ? data.assignedBoothId : (data.primary_centre_id !== undefined ? data.primary_centre_id : null));

    if (existingProfile.length === 0) {
      await db.query(
        `INSERT INTO farmer_profiles (user_id, farmer_id_code, village, taluk, bank_account_name, bank_name, bank_account_number, bank_ifsc, upi_id, primary_centre_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          farmerIdCode || `FAR-${userId.substring(0, 8).toUpperCase()}`,
          village || 'Madurai Rural',
          taluk || 'Madurai',
          bankAccountName,
          bankName,
          bankAccountNumber,
          bankIfsc,
          upiId,
          primaryCentreId,
        ]
      );
    } else {
      await db.query(
        `UPDATE farmer_profiles
         SET village = COALESCE(?, village),
             taluk = COALESCE(?, taluk),
             farmer_id_code = COALESCE(?, farmer_id_code),
             bank_account_name = COALESCE(?, bank_account_name),
             bank_name = COALESCE(?, bank_name),
             bank_account_number = COALESCE(?, bank_account_number),
             bank_ifsc = COALESCE(?, bank_ifsc),
             upi_id = COALESCE(?, upi_id),
             primary_centre_id = COALESCE(?, primary_centre_id)
         WHERE user_id = ?`,
        [
          village,
          taluk,
          farmerIdCode,
          bankAccountName,
          bankName,
          bankAccountNumber,
          bankIfsc,
          upiId,
          primaryCentreId,
          userId,
        ]
      );
    }

    // Check phone uniqueness if phone is being changed
    const newPhone = data.phone !== undefined ? data.phone : (data.mobileNumber !== undefined ? data.mobileNumber : null);
    if (newPhone) {
      const [existingPhone] = await db.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE phone = ? AND id != ?`,
        [newPhone, userId]
      );
      if (existingPhone.length > 0) {
        throw new Error(`Phone number ${newPhone} is already registered to another user`);
      }
    }

    const fullName = data.fullName !== undefined ? data.fullName : (data.full_name !== undefined ? data.full_name : (data.name !== undefined ? data.name : null));
    const preferredLanguage = data.preferredLanguage !== undefined ? data.preferredLanguage : (data.preferred_language !== undefined ? data.preferred_language : null);
    const email = data.email !== undefined ? data.email : null;
    const status = data.status !== undefined ? data.status : null;

    if (fullName || preferredLanguage || newPhone || email || status) {
      await db.query(
        `UPDATE users
         SET full_name = COALESCE(?, full_name),
             preferred_language = COALESCE(?, preferred_language),
             phone = COALESCE(?, phone),
             email = COALESCE(?, email),
             status = COALESCE(?, status)
         WHERE id = ?`,
        [fullName, preferredLanguage, newPhone, email, status, userId]
      );
    }

    return this.getFarmerProfile(userId);
  }


  static async listAllFarmers(centreId?: string) {
    let sql = `
      SELECT u.id, u.full_name, u.phone, fp.farmer_id_code, fp.village, fp.taluk,
             cc.name as centre_name,
             (SELECT COUNT(*) FROM cows WHERE current_owner_user_id = u.id AND is_active = 1) as total_cows
      FROM users u
      JOIN farmer_profiles fp ON u.id = fp.user_id
      LEFT JOIN collection_centres cc ON fp.primary_centre_id = cc.id
      WHERE u.status = 'active'
    `;
    const params: any[] = [];
    if (centreId) {
      sql += ` AND fp.primary_centre_id = ?`;
      params.push(centreId);
    }
    sql += ` ORDER BY u.full_name ASC`;
    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async getFarmerCows(farmerUserId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT c.*,
              (SELECT token FROM cow_qr_tokens WHERE cow_id = c.id AND is_revoked = 0 ORDER BY created_at DESC LIMIT 1) as qr_token,
              (SELECT wr.status FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as active_withdrawal_status,
              (SELECT wr.restriction_end FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as withdrawal_end_time,
              (SELECT u2.full_name FROM cow_veterinarian_assignments cva JOIN users u2 ON cva.vet_user_id = u2.id WHERE cva.cow_id = c.id AND cva.is_primary = 1 LIMIT 1) as assigned_vet_name
       FROM cows c
       WHERE c.current_owner_user_id = ? AND c.is_active = 1
       ORDER BY c.created_at DESC`,
      [farmerUserId]
    );
    return rows;
  }

  static async getFarmerPayments(farmerUserId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT pt.*, fpc.cycle_code, fpc.cycle_start_date, fpc.cycle_end_date
       FROM payment_transactions pt
       JOIN farmer_payment_cycles fpc ON pt.payment_cycle_id = fpc.id
       WHERE pt.farmer_user_id = ?
       ORDER BY pt.created_at DESC`,
      [farmerUserId]
    );
    return rows;
  }
}
