import { Request, Response } from 'express';
import { Router } from 'express';
import { BatchesService } from './batches.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class BatchesController {
  static async list(req: Request, res: Response) {
    try {
      const { centreId, status } = req.query as { centreId?: string; status?: string };
      const batches = await BatchesService.listBatches(centreId, status);
      return sendSuccess(res, batches);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const batch = await BatchesService.getBatchById(req.params.id);
      if (!batch) return sendError(res, 'Batch not found', 404);
      return sendSuccess(res, batch);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const centreId = req.body.centreId || req.user!.primaryCentreId || 'cc-melur-01';
      const result = await BatchesService.createBatch(centreId, req.user!.id, req.body, req.ip);
      return sendSuccess(res, result, 'Batch created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async dispatch(req: Request, res: Response) {
    try {
      const result = await BatchesService.recordMovement(
        req.user!.id,
        req.params.id,
        { ...req.body, eventType: 'dispatched' },
        req.ip
      );
      return sendSuccess(res, result, 'Batch dispatched');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async deliver(req: Request, res: Response) {
    try {
      const result = await BatchesService.recordMovement(
        req.user!.id,
        req.params.id,
        { ...req.body, eventType: 'delivered' },
        req.ip
      );
      return sendSuccess(res, result, 'Batch delivered at dairy');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async discrepancies(req: Request, res: Response) {
    try {
      const result = await BatchesService.recordMovement(
        req.user!.id,
        req.params.id,
        { ...req.body, eventType: 'discrepancy_reported' },
        req.ip
      );
      return sendSuccess(res, result, 'Discrepancy reported');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}

const router = Router();
router.get('/', authenticate, BatchesController.list);
router.post('/', authenticate, authorizeRoles('collection_operator', 'admin'), BatchesController.create);
router.get('/:id', authenticate, BatchesController.getById);
router.post('/:id/dispatch', authenticate, authorizeRoles('transport_vendor', 'collection_operator', 'admin'), BatchesController.dispatch);
router.post('/:id/deliver', authenticate, authorizeRoles('transport_vendor', 'admin'), BatchesController.deliver);
router.post('/:id/discrepancies', authenticate, authorizeRoles('transport_vendor', 'admin'), BatchesController.discrepancies);

export default router;
