import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { AuditService } from '../../services/audit.service.js';
import { RowDataPacket } from 'mysql2';

export class BatchesService {
  static async listBatches(centreId?: string, status?: string) {
    let sql = `
      SELECT b.*, cc.name as centre_name, cc.centre_code,
             u.full_name as creator_name,
             (SELECT COUNT(*) FROM batch_movements WHERE batch_id = b.id) as movement_count
      FROM milk_batches b
      JOIN collection_centres cc ON b.centre_id = cc.id
      JOIN users u ON b.created_by_user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (centreId) {
      sql += ` AND b.centre_id = ?`;
      params.push(centreId);
    }
    if (status) {
      sql += ` AND b.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY b.created_at DESC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async getBatchById(batchId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT b.*, cc.name as centre_name, cc.centre_code, u.full_name as creator_name
       FROM milk_batches b
       JOIN collection_centres cc ON b.centre_id = cc.id
       JOIN users u ON b.created_by_user_id = u.id
       WHERE b.id = ?`,
      [batchId]
    );

    if (!rows.length) return null;

    const [movements] = await db.query<RowDataPacket[]>(
      `SELECT bm.*, u.full_name as vendor_name, vp.vehicle_registration_number
       FROM batch_movements bm
       JOIN users u ON bm.vendor_user_id = u.id
       LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
       WHERE bm.batch_id = ?
       ORDER BY bm.event_time ASC`,
      [batchId]
    );

    return {
      batch: rows[0],
      movements,
    };
  }

  static async createBatch(
    centreId: string,
    userId: string,
    data: {
      totalLitres: number;
      avgFatPercent: number;
      avgSnfPercent: number;
      canCount?: number;
      storageTankerNumber?: string;
    },
    ipAddress?: string
  ) {
    const batchId = uuidv4();
    const batchNumber = `AAVIN-BATCH-${Date.now().toString().slice(-6)}`;

    await db.query(
      `INSERT INTO milk_batches (id, batch_number, centre_id, total_litres, avg_fat_percent,
                                avg_snf_percent, batch_safety_status, can_count, storage_tanker_number,
                                status, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, 'CLEAR', ?, ?, 'assembled', ?)`,
      [
        batchId,
        batchNumber,
        centreId,
        data.totalLitres,
        data.avgFatPercent,
        data.avgSnfPercent,
        data.canCount || 10,
        data.storageTankerNumber || null,
        userId,
      ]
    );

    await AuditService.log({
      actorUserId: userId,
      action: 'BATCH_ASSEMBLED',
      entityType: 'milk_batches',
      entityId: batchId,
      ipAddress,
      details: { batchNumber, litres: data.totalLitres },
    });

    return { batchId, batchNumber };
  }

  static async recordMovement(
    vendorUserId: string,
    batchId: string,
    data: {
      eventType: 'pickup_scanned' | 'dispatched' | 'transit_temp_check' | 'delivered' | 'discrepancy_reported' | 'dairy_accepted';
      litresRecorded: number;
      temperatureC?: number;
      locationLatitude?: number;
      locationLongitude?: number;
      discrepancyLitres?: number;
      discrepancyReason?: string;
      remarks?: string;
    },
    ipAddress?: string
  ) {
    const movementId = uuidv4();

    // Check batch status: restricted batch with safety HOLD cannot be dispatched or released
    const [batchRows] = await db.query<RowDataPacket[]>(
      `SELECT batch_safety_status, status FROM milk_batches WHERE id = ?`,
      [batchId]
    );

    if (!batchRows.length) throw new Error('Batch not found');
    if (batchRows[0].batch_safety_status === 'HOLD' && data.eventType === 'pickup_scanned') {
      throw new Error('SECURITY RESTRICTION: This batch is on HOLD and cannot be picked up or dispatched.');
    }

    await db.query(
      `INSERT INTO batch_movements (id, batch_id, vendor_user_id, event_type, litres_recorded,
                                   temperature_c, location_latitude, location_longitude,
                                   discrepancy_litres, discrepancy_reason, remarks, event_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
      [
        movementId,
        batchId,
        vendorUserId,
        data.eventType,
        data.litresRecorded,
        data.temperatureC || null,
        data.locationLatitude || null,
        data.locationLongitude || null,
        data.discrepancyLitres || 0.0,
        data.discrepancyReason || null,
        data.remarks || null,
      ]
    );

    // Update batch status
    let newStatus = batchRows[0].status;
    if (data.eventType === 'pickup_scanned' || data.eventType === 'dispatched') newStatus = 'in_transit';
    if (data.eventType === 'delivered') newStatus = 'delivered';
    if (data.eventType === 'dairy_accepted') newStatus = 'accepted_at_dairy';

    await db.query(`UPDATE milk_batches SET status = ? WHERE id = ?`, [newStatus, batchId]);

    await AuditService.log({
      actorUserId: vendorUserId,
      action: `BATCH_${data.eventType.toUpperCase()}`,
      entityType: 'batch_movements',
      entityId: movementId,
      ipAddress,
      details: { batchId, eventType: data.eventType, litres: data.litresRecorded },
    });

    return { movementId, status: newStatus };
  }
}
