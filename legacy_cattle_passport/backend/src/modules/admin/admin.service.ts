import { db } from '../../config/database.js';
import { AuditService } from '../../services/audit.service.js';
import { AIService } from '../ai/ai.service.js';
import { RowDataPacket } from 'mysql2';

export class AdminService {
  static async getDashboardMetrics() {
    // 1. Totals counts
    const [counts] = await db.query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM users u JOIN user_roles ur ON u.id = ur.user_id WHERE ur.role_id = 'role-farmer' AND u.status = 'active') as active_farmers,
         (SELECT COUNT(*) FROM cows WHERE is_active = 1) as total_cows,
         (SELECT COUNT(*) FROM users u JOIN user_roles ur ON u.id = ur.user_id WHERE ur.role_id = 'role-vet' AND u.status = 'active') as active_vets,
         (SELECT COUNT(*) FROM collection_centres WHERE is_active = 1) as active_centres,
         (SELECT COUNT(*) FROM milk_batches WHERE status IN ('assembled', 'in_transit')) as active_batches,
         (SELECT COUNT(*) FROM withdrawal_restrictions WHERE status = 'active' AND restriction_end > UTC_TIMESTAMP()) as active_withdrawals`
    );

    // 2. Today's collections
    const [todayCollections] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(quantity_litres), 0) as total_litres_today,
         COALESCE(SUM(calculated_amount_inr), 0) as total_value_today,
         COUNT(*) as total_entries_today
       FROM milk_collection_records
       WHERE DATE(collection_time) = CURRENT_DATE()`
    );

    // 3. Decisions breakdown
    const [decisionCounts] = await db.query<RowDataPacket[]>(
      `SELECT msd.decision, COUNT(*) as count
       FROM milk_safety_decisions msd
       JOIN milk_collection_records mcr ON msd.collection_record_id = mcr.id
       WHERE DATE(mcr.collection_time) = CURRENT_DATE()
       GROUP BY msd.decision`
    );

    // 4. Pending safety reviews
    const [pendingReviews] = await db.query<RowDataPacket[]>(
      `SELECT msd.*, mcr.receipt_number, mcr.quantity_litres, c.name as cow_name, c.tag_number, u.full_name as farmer_name
       FROM milk_safety_decisions msd
       JOIN milk_collection_records mcr ON msd.collection_record_id = mcr.id
       JOIN cows c ON mcr.cow_id = c.id
       JOIN users u ON mcr.farmer_user_id = u.id
       WHERE msd.override_status = 'requested'
       ORDER BY msd.evaluated_at DESC LIMIT 10`
    );

    // 5. AI Settings & Usage
    const aiConfig = await AIService.getSettings();
    const [aiLogs] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total_ai_requests_today,
              SUM(CASE WHEN is_fallback_invoked = 1 THEN 1 ELSE 0 END) as fallback_invocations_today
       FROM ai_usage_logs
       WHERE DATE(created_at) = CURRENT_DATE()`
    );

    return {
      metrics: counts[0],
      today: todayCollections[0],
      decisions: decisionCounts,
      pendingReviews,
      aiState: {
        config: aiConfig,
        usageToday: aiLogs[0],
      },
    };
  }

  static async listUsers(role?: string, status?: string) {
    let sql = `
      SELECT u.id, u.username, u.full_name, u.phone, u.email, u.status, u.created_at, u.last_login_at,
             GROUP_CONCAT(r.name) as roles,
             fp.farmer_id_code, fp.village,
             vp.vet_license_number,
             vnp.vendor_code
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
      LEFT JOIN veterinary_profiles vp ON u.id = vp.user_id
      LEFT JOIN vendor_profiles vnp ON u.id = vnp.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) {
      sql += ` AND u.status = ?`;
      params.push(status);
    }
    sql += ` GROUP BY u.id`;
    if (role) {
      sql += ` HAVING roles LIKE ?`;
      params.push(`%${role}%`);
    }
    sql += ` ORDER BY u.created_at DESC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async updateUserStatus(userId: string, status: string, adminUserId: string, ipAddress?: string) {
    await db.query(`UPDATE users SET status = ? WHERE id = ?`, [status, userId]);

    await AuditService.log({
      actorUserId: adminUserId,
      action: `USER_STATUS_UPDATED_${status.toUpperCase()}`,
      entityType: 'users',
      entityId: userId,
      ipAddress,
      details: { newStatus: status },
    });

    return { userId, status };
  }

  static async getAuditLogs(limit = 50) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT al.*, u.full_name as actor_name, u.username as actor_username
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       ORDER BY al.created_at DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }

  static async reviewSafetyDecision(
    collectionRecordId: string,
    action: 'approved' | 'rejected',
    overrideDecision: 'CLEAR' | 'HOLD' | undefined,
    adminUserId: string,
    reason: string,
    ipAddress?: string
  ) {
    const newDecision = action === 'approved' && overrideDecision ? overrideDecision : undefined;

    let updateSql = `
      UPDATE milk_safety_decisions
      SET override_status = ?,
          override_by_user_id = ?,
          override_reason = ?,
          override_at = UTC_TIMESTAMP()
    `;
    const params: any[] = [action, adminUserId, reason];

    if (newDecision) {
      updateSql += `, decision = ?`;
      params.push(newDecision);
    }

    updateSql += ` WHERE collection_record_id = ?`;
    params.push(collectionRecordId);

    await db.query(updateSql, params);

    await AuditService.log({
      actorUserId: adminUserId,
      action: `SAFETY_REVIEW_${action.toUpperCase()}`,
      entityType: 'milk_safety_decisions',
      entityId: collectionRecordId,
      ipAddress,
      details: { action, overrideDecision: newDecision, reason },
    });

    return { collectionRecordId, status: action, newDecision };
  }
}
