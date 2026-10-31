import { Router } from 'express';
import { VeterinaryController } from './veterinary.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeRoles } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import { healthRecordSchema, treatmentSchema, vaccinationSchema, appointmentSchema } from './veterinary.validation.js';

const router = Router();

router.get('/assignments', authenticate, authorizeRoles('veterinary', 'admin'), VeterinaryController.getAssignedCows);
router.get('/withdrawal-alerts', authenticate, authorizeRoles('veterinary', 'admin', 'collection_operator'), VeterinaryController.getWithdrawalAlerts);
router.get('/medicines', authenticate, VeterinaryController.getMedicines);
router.get('/appointments', authenticate, VeterinaryController.getAppointments);
router.post('/appointments', authenticate, validateBody(appointmentSchema), VeterinaryController.createAppointment);
router.patch('/appointments/:id', authenticate, authorizeRoles('veterinary', 'admin'), VeterinaryController.updateAppointment);

router.post('/health-records', authenticate, authorizeRoles('veterinary', 'admin'), validateBody(healthRecordSchema), VeterinaryController.recordHealth);
router.post('/treatments', authenticate, authorizeRoles('veterinary', 'admin'), validateBody(treatmentSchema), VeterinaryController.recordTreatment);
router.post('/vaccinations', authenticate, authorizeRoles('veterinary', 'admin'), validateBody(vaccinationSchema), VeterinaryController.recordVaccination);

export default router;
