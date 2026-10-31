import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { MilkSafetyTwinEngine, QualityTestInput } from '../safety/safetyEngine.js';
import { PaymentCalculationEngine } from '../payments/payments.engine.js';
import { AuditService } from '../../services/audit.service.js';
import { RowDataPacket } from 'mysql2';

export class CollectionService {
  static async getActiveSession(centreId: string) {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    const sessionType = hour < 14 ? 'morning' : 'evening';

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM collection_sessions
       WHERE centre_id = ? AND session_date = ? AND session_type = ?`,
      [centreId, today, sessionType]
    );

    if (rows.length > 0) return rows[0];

    // Otherwise create new open session for this centre
    const sessionId = `cs-${centreId.substring(0, 8)}-${today}-${sessionType}`;
    const [firstUser] = await db.query<RowDataPacket[]>(
      `SELECT id FROM users WHERE status = 'active' LIMIT 1`
    );
    const openerId = firstUser.length > 0 ? firstUser[0].id : 'usr-admin-01';

    await db.query(
      `INSERT INTO collection_sessions (id, centre_id, session_date, session_type, opened_by_user_id, status)
       VALUES (?, ?, ?, ?, ?, 'open')
       ON DUPLICATE KEY UPDATE status = status`,
      [sessionId, centreId, today, sessionType, openerId]
    );

    const [created] = await db.query<RowDataPacket[]>(
      `SELECT * FROM collection_sessions WHERE id = ?`,
      [sessionId]
    );
    return created[0];
  }

  static async recordMilkCollection(
    operatorUserId: string,
    data: {
      centreId: string;
      farmerUserId: string;
      cowId: string;
      quantityLitres: number;
      temperatureC: number;
      fatPercent: number;
      snfPercent: number;
      densityGcm3?: number;
      acidityPh?: number;
      adulterationDetected?: boolean;
      adulterationTypesTested?: string;
      equipmentDeviceId?: string;
      isDemoData?: boolean;
      operatorNotes?: string;
    },
    ipAddress?: string
  ) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Ensure active collection session
      const session = await this.getActiveSession(data.centreId);
      const collectionId = uuidv4();
      const receiptNumber = `RCP-MDU-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // 2. Evaluate Deterministic Milk Safety Twin
      const testInput: QualityTestInput = {
        fatPercent: Number(data.fatPercent),
        snfPercent: Number(data.snfPercent),
        temperatureC: Number(data.temperatureC),
        densityGcm3: data.densityGcm3 ? Number(data.densityGcm3) : null,
        adulterationDetected: Boolean(data.adulterationDetected),
        adulterationTypesTested: data.adulterationTypesTested,
      };

      const safetyResult = await MilkSafetyTwinEngine.evaluate(data.cowId, testInput);

      // 3. Compute Deterministic Payment Calculation
      const isClear = safetyResult.decision === 'CLEAR';
      const paymentCalc = await PaymentCalculationEngine.calculateCollectionPayment(
        Number(data.quantityLitres),
        Number(data.fatPercent),
        Number(data.snfPercent),
        isClear
      );

      // 4. Insert Collection Record
      await connection.query(
        `INSERT INTO milk_collection_records (
          id, receipt_number, collection_session_id, centre_id, farmer_user_id, cow_id,
          operator_user_id, quantity_litres, temperature_c, equipment_device_id,
          calculated_amount_inr, rate_per_litre_applied, payment_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          collectionId,
          receiptNumber,
          session.id,
          data.centreId,
          data.farmerUserId,
          data.cowId,
          operatorUserId,
          data.quantityLitres,
          data.temperatureC,
          data.equipmentDeviceId || 'ECO-MILK-ANALYZER-MDU-01',
          paymentCalc.totalAmountInr,
          paymentCalc.ratePerLitre,
          isClear ? 'calculated' : 'unprocessed',
        ]
      );

      // 5. Insert Quality Test Record
      const qualityTestId = uuidv4();
      await connection.query(
        `INSERT INTO milk_quality_tests (
          id, collection_record_id, analyzer_device_id, fat_percentage, snf_percentage,
          density_g_cm3, acidity_ph, adulteration_screened, adulteration_detected,
          adulteration_types_tested, is_demo_data, operator_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        [
          qualityTestId,
          collectionId,
          data.equipmentDeviceId || 'ECO-MILK-ANALYZER-MDU-01',
          data.fatPercent,
          data.snfPercent,
          data.densityGcm3 || null,
          data.acidityPh || null,
          data.adulterationDetected ? 1 : 0,
          data.adulterationTypesTested || 'urea,starch,detergent,sugar,salt',
          data.isDemoData ? 1 : 0,
          data.operatorNotes || null,
        ]
      );

      // 6. Insert Safety Decision Record
      const decisionId = uuidv4();
      await connection.query(
        `INSERT INTO milk_safety_decisions (
          id, collection_record_id, decision, primary_reason, decision_details,
          withdrawal_status, withdrawal_end_time, rule_version_id, evaluated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          decisionId,
          collectionId,
          safetyResult.decision,
          safetyResult.primaryReason,
          JSON.stringify(safetyResult.checks),
          safetyResult.checks.withdrawal.status === 'FAILED' ? 'active_hold' : 'none',
          safetyResult.checks.withdrawal.activeRestrictionUntil || null,
          safetyResult.ruleVersion,
        ]
      );

      // 7. Update Session totals
      await connection.query(
        `UPDATE collection_sessions
         SET total_litres_collected = total_litres_collected + ?,
             total_farmers_attended = total_farmers_attended + 1
         WHERE id = ?`,
        [data.quantityLitres, session.id]
      );

      // 8. Generate In-App Notification for Farmer
      await connection.query(
        `INSERT INTO notifications (id, user_id, title, body, category, related_entity_type, related_entity_id)
         VALUES (?, ?, ?, ?, 'collection_receipt', 'collection', ?)`,
        [
          uuidv4(),
          data.farmerUserId,
          `Milk Collection ${safetyResult.decision}: ${data.quantityLitres}L`,
          `Receipt ${receiptNumber} generated. Status: ${safetyResult.decision}. Rate: Rs.${paymentCalc.ratePerLitre}/L. Total: Rs.${paymentCalc.totalAmountInr}.`,
          collectionId,
        ]
      );

      await connection.commit();

      await AuditService.log({
        actorUserId: operatorUserId,
        action: 'MILK_COLLECTION_RECORDED',
        entityType: 'milk_collection_records',
        entityId: collectionId,
        ipAddress,
        details: {
          receiptNumber,
          cowId: data.cowId,
          litres: data.quantityLitres,
          decision: safetyResult.decision,
          amount: paymentCalc.totalAmountInr,
        },
      });

      return {
        collectionId,
        receiptNumber,
        safetyResult,
        paymentCalc,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async getCollections(filters: {
    centreId?: string;
    farmerUserId?: string;
    cowId?: string;
    decision?: string;
    limit?: number;
  }) {
    let sql = `
      SELECT mcr.*,
             u.full_name as farmer_name, u.phone as farmer_phone, fp.farmer_id_code, fp.village,
             c.tag_number, c.name as cow_name, c.breed,
             cc.name as centre_name,
             msd.decision as safety_decision, msd.primary_reason as safety_reason,
             msd.withdrawal_status, msd.override_status,
             mqt.fat_percentage, mqt.snf_percentage, mqt.density_g_cm3, mqt.adulteration_detected,
             mqt.is_demo_data
      FROM milk_collection_records mcr
      JOIN users u ON mcr.farmer_user_id = u.id
      LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
      JOIN cows c ON mcr.cow_id = c.id
      JOIN collection_centres cc ON mcr.centre_id = cc.id
      LEFT JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
      LEFT JOIN milk_quality_tests mqt ON mcr.id = mqt.collection_record_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.centreId) {
      sql += ` AND mcr.centre_id = ?`;
      params.push(filters.centreId);
    }
    if (filters.farmerUserId) {
      sql += ` AND mcr.farmer_user_id = ?`;
      params.push(filters.farmerUserId);
    }
    if (filters.cowId) {
      sql += ` AND mcr.cow_id = ?`;
      params.push(filters.cowId);
    }
    if (filters.decision) {
      sql += ` AND msd.decision = ?`;
      params.push(filters.decision);
    }

    sql += ` ORDER BY mcr.collection_time DESC LIMIT ?`;
    params.push(filters.limit || 50);

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async getCollectionById(collectionId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT mcr.*,
              u.full_name as farmer_name, u.phone as farmer_phone, fp.farmer_id_code, fp.village, fp.bank_account_number, fp.bank_ifsc,
              c.tag_number, c.name as cow_name, c.breed,
              cc.name as centre_name, cc.centre_code,
              op.full_name as operator_name,
              msd.decision as safety_decision, msd.primary_reason as safety_reason, msd.decision_details,
              msd.withdrawal_status, msd.withdrawal_end_time, msd.override_status, msd.override_reason,
              mqt.fat_percentage, mqt.snf_percentage, mqt.density_g_cm3, mqt.acidity_ph,
              mqt.adulteration_detected, mqt.adulteration_types_tested, mqt.analyzer_device_id, mqt.is_demo_data
       FROM milk_collection_records mcr
       JOIN users u ON mcr.farmer_user_id = u.id
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       JOIN cows c ON mcr.cow_id = c.id
       JOIN collection_centres cc ON mcr.centre_id = cc.id
       LEFT JOIN users op ON mcr.operator_user_id = op.id
       LEFT JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
       LEFT JOIN milk_quality_tests mqt ON mcr.id = mqt.collection_record_id
       WHERE mcr.id = ?`,
      [collectionId]
    );

    if (!rows.length) return null;
    return rows[0];
  }

  static async requestDecisionReview(
    collectionId: string,
    operatorUserId: string,
    reason: string,
    ipAddress?: string
  ) {
    await db.query(
      `UPDATE milk_safety_decisions
       SET override_status = 'requested',
           override_by_user_id = ?,
           override_reason = ?,
           override_at = UTC_TIMESTAMP()
       WHERE collection_record_id = ?`,
      [operatorUserId, reason, collectionId]
    );

    await AuditService.log({
      actorUserId: operatorUserId,
      action: 'SAFETY_DECISION_REVIEW_REQUESTED',
      entityType: 'milk_safety_decisions',
      entityId: collectionId,
      ipAddress,
      details: { reason },
    });

    return { collectionId, status: 'review_requested' };
  }
}
