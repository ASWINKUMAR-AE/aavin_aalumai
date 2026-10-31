import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.js';

export class AuditService {
  static async log(params: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      const id = uuidv4();
      await db.execute(
        `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          id,
          params.actorUserId || null,
          params.action,
          params.entityType,
          params.entityId || null,
          params.details ? JSON.stringify(params.details) : null,
          params.ipAddress || null,
          params.userAgent || null,
        ]
      );
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
