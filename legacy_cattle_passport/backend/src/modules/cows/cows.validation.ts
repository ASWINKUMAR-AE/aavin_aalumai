import { z } from 'zod';

export const createCowSchema = z.object({
  tagNumber: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  breed: z.string().default('Jersey Cross'),
  gender: z.enum(['female', 'male']).default('female'),
  dateOfBirth: z.string().optional().nullable(),
  approximateAgeMonths: z.number().int().positive().optional().nullable(),
  primaryCentreId: z.string().optional().nullable(),
  healthStatus: z.enum(['healthy', 'under_treatment', 'quarantine', 'critical', 'retired']).optional(),
  lactationStage: z.enum(['early', 'peak', 'mid', 'late', 'dry', 'heifer']).default('peak'),
  milkingStatus: z.enum(['lactating', 'dry', 'pregnant', 'quarantine_hold']).default('lactating'),
  averageDailyYield: z.number().nonnegative().default(10.0),
  photoUrl: z.string().url().optional().or(z.literal('')).nullable(),
  identificationMarks: z.string().optional().nullable(),
  ownerId: z.string().optional(),
  currentOwnerUserId: z.string().optional(),
  somaticCellCount: z.number().optional(),
  inseminationStatus: z.string().optional(),
  lastCalvingDate: z.string().optional().nullable(),
  lastDewormingDate: z.string().optional().nullable(),
  vaccinationStatus: z.string().optional(),
  dailyConcentrateKg: z.number().optional(),
  dailyGreenFodderKg: z.number().optional(),
  mineralMixtureGrams: z.number().optional(),
  milkSafetyIndex: z.number().optional(),
}).passthrough();

export const updateCowSchema = createCowSchema.partial().passthrough();

