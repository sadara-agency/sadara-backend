import { z } from "zod";

export const triggeringReasonEnum = z.enum([
  "manual",
  "scan",
  "injury",
  "block_change",
]);

export const issuePrescriptionSchema = z.object({
  playerId: z.string().uuid(),
  trainingBlockId: z.string().uuid().optional(),
  targetCalories: z.number().int().positive().optional(),
  targetProteinG: z.number().positive().optional(),
  targetCarbsG: z.number().positive().optional(),
  targetFatG: z.number().positive().optional(),
  hydrationTargetMl: z.number().int().positive().optional(),
  preTrainingGuidance: z.string().max(2000).optional(),
  postTrainingGuidance: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
});

export const updatePrescriptionSchema = issuePrescriptionSchema
  .omit({ playerId: true })
  .partial();

export const reissuePrescriptionSchema = z.object({
  triggeringReason: triggeringReasonEnum.default("manual"),
  triggeringScanId: z.string().uuid().optional(),
});

export const listPrescriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  playerId: z.string().uuid().optional(),
  currentOnly: z.coerce.boolean().default(false),
});

export type IssuePrescriptionDTO = z.infer<typeof issuePrescriptionSchema>;
export type UpdatePrescriptionDTO = z.infer<typeof updatePrescriptionSchema>;
export type ReissuePrescriptionDTO = z.infer<typeof reissuePrescriptionSchema>;
export type ListPrescriptionsQueryDTO = z.infer<
  typeof listPrescriptionsQuerySchema
>;
