import { Request, Response } from 'express';
import { Router } from 'express';
import { FeedingService } from './feeding.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class FeedingController {
  static async getFeedTypes(req: Request, res: Response) {
    try {
      const types = await FeedingService.getFeedTypes();
      return sendSuccess(res, types);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async recordFeeding(req: Request, res: Response) {
    try {
      const result = await FeedingService.recordFeeding(req.user!.id, req.body);
      return sendSuccess(res, result, 'Feeding record saved', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const { cowId } = req.query as { cowId?: string };
      const farmerId = req.user!.roles.includes('farmer') ? req.user!.id : undefined;
      const records = await FeedingService.getFeedingRecords(cowId, farmerId);
      return sendSuccess(res, records);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}

const router = Router();
router.get('/types', authenticate, FeedingController.getFeedTypes);
router.post('/', authenticate, FeedingController.recordFeeding);
router.get('/', authenticate, FeedingController.list);

export default router;
