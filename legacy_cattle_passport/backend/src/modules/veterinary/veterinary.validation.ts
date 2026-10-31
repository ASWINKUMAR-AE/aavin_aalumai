import { z } from 'zod';

export const healthRecordSchema = z.object({
  cowId: z.string().uuid(),
  bodyTemperatureC: z.number().optional(),
  heartRateBpm: z.number().int().optional(),
  rumenMotility: z.string().optional(),
  bodyConditionScore: z.number().optional(),
  clinicalSigns: z.string().min(3),
  diagnosis: z.string().min(3),
  healthStatusAssigned: z.enum(['healthy', 'under_treatment', 'quarantine', 'critical']),
  recommendations: z.string().optional(),
  nextFollowUpDate: z.string().optional(),
});

export const treatmentSchema = z.object({
  cowId: z.string().uuid(),
  medicineId: z.string().optional(),
  customMedicineName: z.string().optional(),
  dosage: z.string().min(2),
  routeOfAdministration: z.enum(['intramuscular', 'intravenous', 'subcutaneous', 'intramammary', 'oral', 'topical']).default('intramuscular'),
  treatmentStartDate: z.string(),
  treatmentEndDate: z.string(),
  withdrawalPeriodDays: z.number().int().min(0),
  reasonForTreatment: z.string().min(3),
  notes: z.string().optional(),
});

export const vaccinationSchema = z.object({
  cowId: z.string().uuid(),
  vaccineName: z.string().min(2),
  batchNumber: z.string().min(1),
  dose: z.string().min(1),
  administrationDate: z.string(),
  nextBoosterDueDate: z.string(),
  notes: z.string().optional(),
});

export const appointmentSchema = z.object({
  cowId: z.string().uuid(),
  vetUserId: z.string().uuid().optional(),
  requestedDate: z.string(),
  appointmentType: z.enum(['routine_checkup', 'artificial_insemination', 'illness_emergency', 'vaccination', 'pregnancy_diagnosis']),
  farmerNotes: z.string().optional(),
});
