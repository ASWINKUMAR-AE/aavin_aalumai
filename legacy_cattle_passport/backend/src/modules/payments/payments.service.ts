import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { AuditService } from '../../services/audit.service.js';
import { RowDataPacket } from 'mysql2';

export class PaymentsService {
  static async getPaymentCycles() {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT fpc.*, u.full_name as approved_by_name
       FROM farmer_payment_cycles fpc
       LEFT JOIN users u ON fpc.approved_by_user_id = u.id
       ORDER BY fpc.cycle_start_date DESC`
    );
    return rows;
  }

  static async getFarmerPayments(farmerUserId: string) {
    const [transactions] = await db.query<RowDataPacket[]>(
      `SELECT pt.*, fpc.cycle_code, fpc.cycle_start_date, fpc.cycle_end_date
       FROM payment_transactions pt
       JOIN farmer_payment_cycles fpc ON pt.payment_cycle_id = fpc.id
       WHERE pt.farmer_user_id = ?
       ORDER BY pt.created_at DESC`,
      [farmerUserId]
    );

    const [collections] = await db.query<RowDataPacket[]>(
      `SELECT mcr.id, mcr.receipt_number, mcr.quantity_litres, mcr.rate_per_litre_applied,
              mcr.calculated_amount_inr, mcr.payment_status, mcr.collection_time,
              c.name as cow_name, c.tag_number,
              msd.decision
       FROM milk_collection_records mcr
       JOIN cows c ON mcr.cow_id = c.id
       LEFT JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
       WHERE mcr.farmer_user_id = ?
       ORDER BY mcr.collection_time DESC LIMIT 20`,
      [farmerUserId]
    );

    // Calculate totals
    const [summaryRows] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_status = 'calculated' THEN calculated_amount_inr ELSE 0 END), 0) as pending_amount,
         COALESCE(SUM(CASE WHEN payment_status = 'approved' THEN calculated_amount_inr ELSE 0 END), 0) as approved_amount,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN calculated_amount_inr ELSE 0 END), 0) as paid_amount,
         COALESCE(SUM(quantity_litres), 0) as total_litres
       FROM milk_collection_records
       WHERE farmer_user_id = ?`,
      [farmerUserId]
    );

    return {
      summary: summaryRows[0] || { pending_amount: 0, approved_amount: 0, paid_amount: 0, total_litres: 0 },
      transactions,
      recentCollections: collections,
    };
  }

  static async calculateCycle(cycleId: string, actorUserId: string) {
    const [cycleRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM farmer_payment_cycles WHERE id = ?`,
      [cycleId]
    );
    if (!cycleRows.length) throw new Error('Payment cycle not found');
    const cycle = cycleRows[0];

    // Aggregate all CLEAR collections within the cycle date window
    const [aggRows] = await db.query<RowDataPacket[]>(
      `SELECT mcr.farmer_user_id,
              SUM(mcr.quantity_litres) as total_litres,
              SUM(mcr.calculated_amount_inr) as gross_amount
       FROM milk_collection_records mcr
       JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
       WHERE msd.decision = 'CLEAR'
         AND DATE(mcr.collection_time) >= ?
         AND DATE(mcr.collection_time) <= ?
       GROUP BY mcr.farmer_user_id`,
      [cycle.cycle_start_date, cycle.cycle_end_date]
    );

    let totalCycleLitres = 0;
    let totalCycleAmount = 0;

    for (const row of aggRows) {
      totalCycleLitres += Number(row.total_litres);
      totalCycleAmount += Number(row.gross_amount);
    }

    await db.query(
      `UPDATE farmer_payment_cycles
       SET total_milk_litres = ?, total_amount_inr = ?, status = 'pending_approval'
       WHERE id = ?`,
      [totalCycleLitres, totalCycleAmount, cycleId]
    );

    return {
      cycleId,
      farmersCount: aggRows.length,
      totalLitres: totalCycleLitres,
      totalAmountInr: totalCycleAmount,
      status: 'pending_approval',
    };
  }

  static async approveCycle(cycleId: string, adminUserId: string, ipAddress?: string) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [cycleRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM farmer_payment_cycles WHERE id = ?`,
        [cycleId]
      );
      if (!cycleRows.length) throw new Error('Payment cycle not found');
      const cycle = cycleRows[0];

      // Fetch aggregated per farmer
      const [aggRows] = await connection.query<RowDataPacket[]>(
        `SELECT mcr.farmer_user_id,
                SUM(mcr.quantity_litres) as total_litres,
                SUM(mcr.calculated_amount_inr) as gross_amount
         FROM milk_collection_records mcr
         JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
         WHERE msd.decision = 'CLEAR'
           AND DATE(mcr.collection_time) >= ?
           AND DATE(mcr.collection_time) <= ?
         GROUP BY mcr.farmer_user_id`,
        [cycle.cycle_start_date, cycle.cycle_end_date]
      );

      for (const row of aggRows) {
        const txId = uuidv4();
        const txRef = `TXN-AAVIN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        await connection.query(
          `INSERT INTO payment_transactions (
            id, transaction_reference, payment_cycle_id, farmer_user_id,
            total_litres, gross_amount_inr, deductions_inr, net_payable_inr, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, 'approved', UTC_TIMESTAMP())
          ON DUPLICATE KEY UPDATE net_payable_inr = VALUES(net_payable_inr)`,
          [
            txId,
            txRef,
            cycleId,
            row.farmer_user_id,
            row.total_litres,
            row.gross_amount,
            row.gross_amount,
          ]
        );
      }

      // Mark cycle approved
      await connection.query(
        `UPDATE farmer_payment_cycles
         SET status = 'approved', approved_by_user_id = ?, approved_at = UTC_TIMESTAMP()
         WHERE id = ?`,
        [adminUserId, cycleId]
      );

      await connection.commit();

      await AuditService.log({
        actorUserId: adminUserId,
        action: 'PAYMENT_CYCLE_APPROVED',
        entityType: 'farmer_payment_cycles',
        entityId: cycleId,
        ipAddress,
        details: { cycleCode: cycle.cycle_code, totalAmount: cycle.total_amount_inr },
      });

      return { cycleId, status: 'approved', approvedCount: aggRows.length };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}
