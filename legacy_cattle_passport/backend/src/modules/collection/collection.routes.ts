import { Router } from 'express';
import { CollectionController } from './collection.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';

const router = Router();

router.get('/session', authenticate, CollectionController.getActiveSession);
router.post('/', authenticate, authorizeRoles('collection_operator', 'admin'), CollectionController.recordCollection);
router.get('/', authenticate, CollectionController.list);
router.get('/:id', authenticate, CollectionController.getById);
router.post('/:id/request-review', authenticate, authorizeRoles('collection_operator', 'admin'), CollectionController.requestReview);

export default router;
