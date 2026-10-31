import { Request, Response } from 'express';
import { CollectionService } from './collection.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class CollectionController {
  static async getActiveSession(req: Request, res: Response) {
    try {
      const centreId = (req.query.centreId as string) || req.user!.primaryCentreId || 'cc-melur-01';
      const session = await CollectionService.getActiveSession(centreId);
      return sendSuccess(res, session);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async recordCollection(req: Request, res: Response) {
    try {
      const result = await CollectionService.recordMilkCollection(req.user!.id, req.body, req.ip);
      return sendSuccess(res, result, 'Milk collection recorded & safety evaluated', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const { centreId, cowId, decision, limit } = req.query as {
        centreId?: string;
        cowId?: string;
        decision?: string;
        limit?: string;
      };

      const farmerId = req.user!.roles.includes('farmer') && !req.user!.roles.includes('admin')
        ? req.user!.id
        : (req.query.farmerUserId as string);

      const records = await CollectionService.getCollections({
        centreId,
        farmerUserId: farmerId,
        cowId,
        decision,
        limit: limit ? parseInt(limit, 10) : 50,
      });

      return sendSuccess(res, records);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const collection = await CollectionService.getCollectionById(req.params.id);
      if (!collection) return sendError(res, 'Collection record not found', 404);

      if (req.user!.roles.includes('farmer') && collection.farmer_user_id !== req.user!.id) {
        return sendError(res, 'Forbidden: You can only view your own receipts', 403);
      }

      return sendSuccess(res, collection);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async requestReview(req: Request, res: Response) {
    try {
      const { reason } = req.body;
      if (!reason) return sendError(res, 'Review reason is required', 400);

      const result = await CollectionService.requestDecisionReview(
        req.params.id,
        req.user!.id,
        reason,
        req.ip
      );
      return sendSuccess(res, result, 'Review request submitted for Aavin supervisor approval');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
