import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

export class FeedingService {
  static async getFeedTypes() {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM feed_types ORDER BY name ASC`);
    return rows;
  }

  static async recordFeeding(farmerUserId: string, data: any) {
    const id = uuidv4();
    await db.query(
      `INSERT INTO feeding_records (id, cow_id, farmer_user_id, feed_type_id, quantity_kg, feeding_time, feeding_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.cowId,
        farmerUserId,
        data.feedTypeId,
        data.quantityKg,
        data.feedingTime || 'morning',
        data.feedingDate || new Date().toISOString().split('T')[0],
        data.notes || null,
      ]
    );
    return { id };
  }

  static async getFeedingRecords(cowId?: string, farmerUserId?: string, limit = 20) {
    let sql = `
      SELECT fr.*, ft.name as feed_name, ft.category as feed_category, c.name as cow_name, c.tag_number
      FROM feeding_records fr
      JOIN feed_types ft ON fr.feed_type_id = ft.id
      JOIN cows c ON fr.cow_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (cowId) {
      sql += ` AND fr.cow_id = ?`;
      params.push(cowId);
    }
    if (farmerUserId) {
      sql += ` AND fr.farmer_user_id = ?`;
      params.push(farmerUserId);
    }
    sql += ` ORDER BY fr.feeding_date DESC, fr.created_at DESC LIMIT ?`;
    params.push(limit);

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }
}
