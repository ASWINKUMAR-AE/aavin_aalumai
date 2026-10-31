import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { RowDataPacket } from 'mysql2';

export class ProductionService {
  static async recordProduction(farmerUserId: string, data: any) {
    const id = uuidv4();
    const productionDate = data.productionDate || new Date().toISOString().split('T')[0];
    const session = data.session || 'morning';
    const milkingTime = data.milkingTime || (session === 'morning' ? '06:00:00' : '17:30:00');

    await db.query(
      `INSERT INTO milk_production_records (id, cow_id, farmer_user_id, session, production_date, quantity_litres, milking_time, cow_condition_notes, fat_percentage, snf_percentage, milking_temperature_c, teat_dip_applied)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity_litres = VALUES(quantity_litres),
                               milking_time = VALUES(milking_time),
                               cow_condition_notes = VALUES(cow_condition_notes),
                               fat_percentage = VALUES(fat_percentage),
                               snf_percentage = VALUES(snf_percentage),
                               milking_temperature_c = VALUES(milking_temperature_c),
                               teat_dip_applied = VALUES(teat_dip_applied)`,
      [
        id,
        data.cowId,
        farmerUserId,
        session,
        productionDate,
        data.quantityLitres,
        milkingTime,
        data.cowConditionNotes || null,
        data.fatPercentage !== undefined ? data.fatPercentage : 4.2,
        data.snfPercentage !== undefined ? data.snfPercentage : 8.5,
        data.milkingTemperatureC !== undefined ? data.milkingTemperatureC : 37.2,
        data.teatDipApplied !== undefined ? (data.teatDipApplied ? 1 : 0) : 1,
      ]
    );

    return { id, productionDate, session, quantityLitres: data.quantityLitres };
  }

  static async getProductionRecords(farmerUserId?: string, cowId?: string, days = 14) {
    let sql = `
      SELECT mpr.*, c.name as cow_name, c.tag_number, c.breed
      FROM milk_production_records mpr
      JOIN cows c ON mpr.cow_id = c.id
      WHERE mpr.production_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;
    const params: any[] = [days];

    if (farmerUserId) {
      sql += ` AND mpr.farmer_user_id = ?`;
      params.push(farmerUserId);
    }
    if (cowId) {
      sql += ` AND mpr.cow_id = ?`;
      params.push(cowId);
    }

    sql += ` ORDER BY mpr.production_date DESC, mpr.session DESC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async getProductionSummary(farmerUserId: string) {
    // Total today morning vs evening
    const [todayRows] = await db.query<RowDataPacket[]>(
      `SELECT session, COALESCE(SUM(quantity_litres), 0) as total_litres
       FROM milk_production_records
       WHERE farmer_user_id = ? AND production_date = CURDATE()
       GROUP BY session`,
      [farmerUserId]
    );

    // 7-day trend
    const [trendRows] = await db.query<RowDataPacket[]>(
      `SELECT production_date,
              SUM(CASE WHEN session = 'morning' THEN quantity_litres ELSE 0 END) as morning_litres,
              SUM(CASE WHEN session = 'evening' THEN quantity_litres ELSE 0 END) as evening_litres,
              SUM(quantity_litres) as total_litres
       FROM milk_production_records
       WHERE farmer_user_id = ? AND production_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY production_date
       ORDER BY production_date ASC`,
      [farmerUserId]
    );

    return {
      today: todayRows,
      weeklyTrend: trendRows,
    };
  }
}
