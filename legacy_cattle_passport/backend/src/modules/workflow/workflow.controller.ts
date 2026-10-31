import { Request, Response } from 'express';
import { WorkflowService } from './workflow.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class WorkflowController {
  static async getBooths(req: Request, res: Response) {
    try {
      const data = await WorkflowService.getBooths();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getBmcs(req: Request, res: Response) {
    try {
      const data = await WorkflowService.getBmcs();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getVendors(req: Request, res: Response) {
    try {
      const data = await WorkflowService.getVendors();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async recordMilkTransaction(req: Request, res: Response) {
    try {
      const userId = req.user?.id || 'usr-booth-01';
      const result = await WorkflowService.recordMilkTransaction({
        ...req.body,
        createdByUserId: userId,
      });
      return sendSuccess(res, result, 'Milk transaction recorded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async listMilkTransactions(req: Request, res: Response) {
    try {
      const { boothId, collectionDate, farmerUserId } = req.query as {
        boothId?: string;
        collectionDate?: string;
        farmerUserId?: string;
      };
      const data = await WorkflowService.listMilkTransactions(boothId, collectionDate, farmerUserId);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async reviewBoothCollection(req: Request, res: Response) {
    try {
      const { boothId, collectionDate } = req.query as { boothId: string; collectionDate: string };
      if (!boothId || !collectionDate) {
        return sendError(res, 'boothId and collectionDate are required query parameters', 400);
      }
      const data = await WorkflowService.reviewBoothCollection(boothId, collectionDate);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async generateBoothReceipt(req: Request, res: Response) {
    try {
      const userId = req.user?.id || 'usr-booth-01';
      const result = await WorkflowService.generateBoothReceipt({
        ...req.body,
        createdByUserId: userId,
      });
      return sendSuccess(res, result, 'Booth receipt generated and dispatched to BMC', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async listBmcDeliveries(req: Request, res: Response) {
    try {
      const { bmcId } = req.query as { bmcId?: string };
      const data = await WorkflowService.listBmcDeliveries(bmcId);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async confirmBmcDelivery(req: Request, res: Response) {
    try {
      const userId = req.user?.id || 'usr-bmc-01';
      const userName = req.user?.fullName || 'BMC Officer';
      const result = await WorkflowService.confirmBmcDelivery(req.params.deliveryId, {
        ...req.body,
        receivedByUserId: userId,
        receivedByName: userName,
      });
      return sendSuccess(res, result, 'BMC delivery confirmed');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async listDiscrepancies(req: Request, res: Response) {
    try {
      const { status } = req.query as { status?: string };
      const data = await WorkflowService.listDiscrepancies(status);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async updateDiscrepancy(req: Request, res: Response) {
    try {
      const { action } = req.body;
      const result = await WorkflowService.updateDiscrepancy(req.params.caseId, action, req.body);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async generateBmcReceipt(req: Request, res: Response) {
    try {
      const userId = req.user?.id || 'usr-bmc-01';
      const { bmcId, collectionDate } = req.body;
      if (!bmcId || !collectionDate) {
        return sendError(res, 'bmcId and collectionDate are required', 400);
      }
      const result = await WorkflowService.generateBmcReceipt(bmcId, collectionDate, userId);
      return sendSuccess(res, result, 'BMC daily receipt generated and submitted to Union', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async listUnionBmcReceipts(req: Request, res: Response) {
    try {
      const data = await WorkflowService.listUnionBmcReceipts();
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async reviewUnionReceipt(req: Request, res: Response) {
    try {
      const userId = req.user?.id || 'usr-union-01';
      const { notes } = req.body;
      const result = await WorkflowService.reviewUnionReceipt(req.params.receiptId, notes, userId);
      return sendSuccess(res, result, 'BMC receipt approved by Union');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getConsolidatedSummary(req: Request, res: Response) {
    try {
      const { date } = req.query as { date?: string };
      const data = await WorkflowService.getConsolidatedSummary(date);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}
