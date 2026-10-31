import { Router } from 'express';
import { AIController } from './ai.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';
import { aiRateLimiter } from '../../middleware/rateLimit.js';

const router = Router();

router.post('/chat', authenticate, aiRateLimiter, AIController.chat);
router.post('/cow-summary', authenticate, aiRateLimiter, AIController.cowSummary);
router.post('/production-insights', authenticate, aiRateLimiter, AIController.productionInsights);
router.post('/quality-summary', authenticate, aiRateLimiter, AIController.qualitySummary);
router.post('/translate', aiRateLimiter, AIController.translate);

// Admin AI endpoints
router.get('/admin/config', authenticate, authorizeRoles('admin'), AIController.getConfig);
router.patch('/admin/config', authenticate, authorizeRoles('admin'), AIController.updateConfig);
router.post('/admin/test', authenticate, authorizeRoles('admin'), AIController.testConnectivity);
router.get('/admin/health', authenticate, authorizeRoles('admin'), AIController.getHealth);

export default router;
