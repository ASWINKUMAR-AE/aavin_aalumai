import { Request, Response } from 'express';
import { Router } from 'express';
import { PaymentsService } from './payments.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class PaymentsController {
  static async getMyPayments(req: Request, res: Response) {
    try {
      const data = await PaymentsService.getFarmerPayments(req.user!.id);
      return sendSuccess(res, data);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getCycles(req: Request, res: Response) {
    try {
      const cycles = await PaymentsService.getPaymentCycles();
      return sendSuccess(res, cycles);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async calculateCycle(req: Request, res: Response) {
    try {
      const { cycleId } = req.body;
      const result = await PaymentsService.calculateCycle(cycleId, req.user!.id);
      return sendSuccess(res, result, 'Cycle ledger calculated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async approveCycle(req: Request, res: Response) {
    try {
      const { cycleId } = req.body;
      const result = await PaymentsService.approveCycle(cycleId, req.user!.id, req.ip);
      return sendSuccess(res, result, 'Payment cycle approved for disbursement');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}

const router = Router();
router.get('/me', authenticate, PaymentsController.getMyPayments);
router.get('/payment-cycles', authenticate, PaymentsController.getCycles);
router.post('/calculate', authenticate, authorizeRoles('admin'), PaymentsController.calculateCycle);
router.post('/approve', authenticate, authorizeRoles('admin'), PaymentsController.approveCycle);

export default router;
