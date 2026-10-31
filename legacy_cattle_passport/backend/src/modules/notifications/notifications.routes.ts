import { Request, Response, Router } from 'express';
import { db } from '../../config/database.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { RowDataPacket } from 'mysql2';

export class NotificationsService {
  static async getUserNotifications(userId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    return rows;
  }

  static async markRead(notificationId: string, userId: string) {
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    return { notificationId, isRead: 1 };
  }
}

export class NotificationsController {
  static async list(req: Request, res: Response) {
    try {
      const list = await NotificationsService.getUserNotifications(req.user!.id);
      return sendSuccess(res, list);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async markRead(req: Request, res: Response) {
    try {
      const result = await NotificationsService.markRead(req.params.id, req.user!.id);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}

const router = Router();
router.get('/', authenticate, NotificationsController.list);
router.patch('/:id/read', authenticate, NotificationsController.markRead);

export default router;
