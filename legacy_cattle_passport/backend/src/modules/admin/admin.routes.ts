import { Request, Response } from 'express';
import { Router } from 'express';
import { AdminService } from './admin.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class AdminController {
  static async getDashboard(req: Request, res: Response) {
    try {
      const data = await AdminService.getDashboardMetrics();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getUsers(req: Request, res: Response) {
    try {
      const { role, status } = req.query as { role?: string; status?: string };
      const users = await AdminService.listUsers(role, status);
      return sendSuccess(res, users);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await AdminService.updateUserStatus(id, status, req.user!.id, req.ip);
      return sendSuccess(res, result, `User status updated to ${status}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await AdminService.getAuditLogs(limit);
      return sendSuccess(res, logs);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async reviewDecision(req: Request, res: Response) {
    try {
      const { collectionRecordId, action, overrideDecision, reason } = req.body;
      const result = await AdminService.reviewSafetyDecision(
        collectionRecordId,
        action,
        overrideDecision,
        req.user!.id,
        reason || 'Admin review completed',
        req.ip
      );
      return sendSuccess(res, result, `Decision review ${action}`);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}

const router = Router();
router.use(authenticate, authorizeRoles('admin'));

router.get('/dashboard', AdminController.getDashboard);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.get('/audit-logs', AdminController.getAuditLogs);
router.post('/review-decision', AdminController.reviewDecision);

export default router;
