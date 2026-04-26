import { z } from "zod";

const monetaryField = z.coerce
  .number()
  .min(0)
  .multipleOf(0.01)
  .optional()
  .nullable();

export const createInjuryFinancialsSchema = z.object({
  injuryId: z.string().uuid(),
  playerId: z.string().uuid(),
  monthlySalaryQar: monetaryField,
  missedMatchesCount: z.coerce.number().int().min(0).optional(),
  estimatedMatchRevenueQar: monetaryField,
  insuranceCovered: z.boolean().optional(),
  insuranceAmountQar: monetaryField,
  treatmentCostQar: monetaryField,
  currency: z.string().max(10).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateInjuryFinancialsSchema = z
  .object({
    monthlySalaryQar: monetaryField,
    missedMatchesCount: z.coerce.number().int().min(0).optional(),
    estimatedMatchRevenueQar: monetaryField,
    insuranceCovered: z.boolean().optional(),
    insuranceAmountQar: monetaryField,
    treatmentCostQar: monetaryField,
    currency: z.string().max(10).optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .partial();

export const injuryFinancialsQuerySchema = z.object({
  playerId: z.string().uuid().optional(),
  injuryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export type CreateInjuryFinancialsInput = z.infer<
  typeof createInjuryFinancialsSchema
>;
export type UpdateInjuryFinancialsInput = z.infer<
  typeof updateInjuryFinancialsSchema
>;
export type InjuryFinancialsQuery = z.infer<typeof injuryFinancialsQuerySchema>;
