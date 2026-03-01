import { z } from 'zod';

export const INJURY_STATUSES = ['UnderTreatment', 'Recovered', 'Relapsed', 'Chronic'] as const;
export const INJURY_SEVERITIES = ['Minor', 'Moderate', 'Severe', 'Critical'] as const;
export const INJURY_CAUSES = ['Training', 'Match', 'NonFootball', 'Unknown'] as const;

export const createInjurySchema = z.object({
  playerId: z.string().uuid(),
  matchId: z.string().uuid().optional(),
  injuryType: z.string().min(1, 'Injury type is required'),
  injuryTypeAr: z.string().optional(),
  bodyPart: z.string().min(1, 'Body part is required'),
  bodyPartAr: z.string().optional(),
  severity: z.enum(INJURY_SEVERITIES).default('Moderate'),
  cause: z.enum(INJURY_CAUSES).default('Unknown'),
  injuryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  diagnosis: z.string().optional(),
  diagnosisAr: z.string().optional(),
  treatmentPlan: z.string().optional(),
  treatmentPlanAr: z.string().optional(),
  medicalProvider: z.string().optional(),
  surgeonName: z.string().optional(),
  estimatedDaysOut: z.number().int().min(0).optional(),
  isSurgeryRequired: z.boolean().default(false),
  surgeryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
});

export const updateInjurySchema = z.object({
  injuryType: z.string().min(1).optional(),
  injuryTypeAr: z.string().optional(),
  bodyPart: z.string().min(1).optional(),
  bodyPartAr: z.string().optional(),
  severity: z.enum(INJURY_SEVERITIES).optional(),
  cause: z.enum(INJURY_CAUSES).optional(),
  status: z.enum(INJURY_STATUSES).optional(),
  expectedReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  actualReturnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  diagnosis: z.string().optional(),
  diagnosisAr: z.string().optional(),
  treatmentPlan: z.string().optional(),
  treatmentPlanAr: z.string().optional(),
  medicalProvider: z.string().optional(),
  surgeonName: z.string().optional(),
  estimatedDaysOut: z.number().int().min(0).nullable().optional(),
  actualDaysOut: z.number().int().min(0).nullable().optional(),
  isSurgeryRequired: z.boolean().optional(),
  surgeryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().optional(),
});

export const addInjuryUpdateSchema = z.object({
  status: z.enum(INJURY_STATUSES).optional(),
  notes: z.string().min(1, 'Notes required'),
  notesAr: z.string().optional(),
});

export const injuryQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  status: z.enum(INJURY_STATUSES).optional(),
  severity: z.enum(INJURY_SEVERITIES).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional(),
  search: z.string().optional(),
});

export type CreateInjuryInput = z.infer<typeof createInjurySchema>;
export type UpdateInjuryInput = z.infer<typeof updateInjurySchema>;
export type AddInjuryUpdateInput = z.infer<typeof addInjuryUpdateSchema>;