import { Request, Response } from 'express';
import { Router } from 'express';
import { ProductionService } from './production.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class ProductionController {
  static async record(req: Request, res: Response) {
    try {
      const result = await ProductionService.recordProduction(req.user!.id, req.body);
      return sendSuccess(res, result, 'Milk production recorded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const { cowId, days } = req.query as { cowId?: string; days?: string };
      const farmerId = req.user!.roles.includes('farmer') ? req.user!.id : undefined;
      const records = await ProductionService.getProductionRecords(
        farmerId,
        cowId,
        days ? parseInt(days, 10) : 14
      );
      return sendSuccess(res, records);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const farmerId = req.user!.id;
      const summary = await ProductionService.getProductionSummary(farmerId);
      return sendSuccess(res, summary);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}

const router = Router();
router.post('/', authenticate, ProductionController.record);
router.get('/', authenticate, ProductionController.list);
router.get('/summary', authenticate, ProductionController.getSummary);

export default router;
