import { Router } from 'express';
import { FarmersController } from './farmers.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';

const router = Router();

router.patch('/portal/farmer/:id', FarmersController.updatePortalFarmer);
router.put('/portal/farmer/:id', FarmersController.updatePortalFarmer);

router.get('/me', authenticate, FarmersController.getMe);
router.patch('/me', authenticate, FarmersController.updateMe);
router.get('/', authenticate, authorizeRoles('admin', 'veterinary', 'collection_operator', 'booth'), FarmersController.listAll);
router.get('/:id', authenticate, FarmersController.getById);
router.patch('/:id', authenticate, authorizeRoles('admin', 'veterinary', 'farmer', 'booth', 'collection_operator'), FarmersController.updateById);
router.put('/:id', authenticate, authorizeRoles('admin', 'veterinary', 'farmer', 'booth', 'collection_operator'), FarmersController.updateById);
router.get('/:id/cows', authenticate, FarmersController.getFarmerCows);
router.get('/:id/payments', authenticate, FarmersController.getFarmerPayments);

export default router;

