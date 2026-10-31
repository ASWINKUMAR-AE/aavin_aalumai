import { Router } from 'express';
import { CowsController } from './cows.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { createCowSchema, updateCowSchema } from './cows.validation.js';

const router = Router();

// Public web portal endpoints for cattle QR codes and live ledger
router.get('/portal/all-tags', CowsController.getPortalAllTags);
router.get('/portal/summary', CowsController.getPortalSummary);
router.get('/portal/passport/:identifier', CowsController.getPortalPassport);
router.post('/portal/generate-tag', CowsController.createPortalTag);
router.patch('/portal/cow/:id', validateBody(updateCowSchema), CowsController.updatePortalCow);
router.put('/portal/cow/:id', validateBody(updateCowSchema), CowsController.updatePortalCow);

router.get('/lookup/:identifier', authenticate, CowsController.lookup);
router.get('/:id/passport', authenticate, CowsController.getPassport);
router.get('/', authenticate, CowsController.list);
router.post('/', authenticate, authorizeRoles('farmer', 'admin', 'veterinary'), validateBody(createCowSchema), CowsController.create);
router.get('/:id', authenticate, CowsController.getById);
router.patch('/:id', authenticate, authorizeRoles('veterinary', 'admin', 'farmer'), validateBody(updateCowSchema), CowsController.update);
router.put('/:id', authenticate, authorizeRoles('veterinary', 'admin', 'farmer'), validateBody(updateCowSchema), CowsController.update);

export default router;

