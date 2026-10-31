import { Router } from 'express';
import { WorkflowController } from './workflow.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';

const router = Router();

// Master Data: Booths, BMCs, Vendors
router.get('/booths', authenticate, WorkflowController.getBooths);
router.get('/bmcs', authenticate, WorkflowController.getBmcs);
router.get('/vendors', authenticate, WorkflowController.getVendors);

// Stage 1 & 2: Milk Transactions & Booth Operations
router.post('/milk-transactions', authenticate, authorizeRoles('booth', 'collection_operator', 'admin'), WorkflowController.recordMilkTransaction);
router.get('/milk-transactions', authenticate, WorkflowController.listMilkTransactions);
router.get('/booth-review', authenticate, authorizeRoles('booth', 'collection_operator', 'admin'), WorkflowController.reviewBoothCollection);
router.post('/booth-receipts', authenticate, authorizeRoles('booth', 'collection_operator', 'admin'), WorkflowController.generateBoothReceipt);

// Stage 3: BMC Receiving & Delivery Verification
router.get('/bmc-deliveries', authenticate, authorizeRoles('bmc', 'union', 'admin'), WorkflowController.listBmcDeliveries);
router.post('/bmc-deliveries/:deliveryId/confirm', authenticate, authorizeRoles('bmc', 'admin'), WorkflowController.confirmBmcDelivery);

// Discrepancy Investigation Ledger
router.get('/discrepancies', authenticate, authorizeRoles('bmc', 'union', 'admin'), WorkflowController.listDiscrepancies);
router.patch('/discrepancies/:caseId', authenticate, authorizeRoles('bmc', 'union', 'admin'), WorkflowController.updateDiscrepancy);

// Stage 4: BMC Receipts & Union Review
router.post('/bmc-receipts', authenticate, authorizeRoles('bmc', 'admin'), WorkflowController.generateBmcReceipt);
router.get('/union-receipts', authenticate, authorizeRoles('union', 'admin'), WorkflowController.listUnionBmcReceipts);
router.post('/union-receipts/:receiptId/review', authenticate, authorizeRoles('union', 'admin'), WorkflowController.reviewUnionReceipt);
router.get('/union-summary', authenticate, authorizeRoles('union', 'admin'), WorkflowController.getConsolidatedSummary);

export default router;
