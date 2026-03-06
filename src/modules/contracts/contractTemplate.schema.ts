import { z } from "zod";

const CONTRACT_TYPES = [
  "Representation", "CareerManagement", "Transfer", "Loan",
  "Renewal", "Sponsorship", "ImageRights", "MedicalAuth",
] as const;

const CATEGORIES = ["Club", "Sponsorship"] as const;

const defaultValuesSchema = z.object({
  playerContractType: z.enum(["Professional", "Amateur", "Youth"]).optional(),
  exclusivity: z.enum(["Exclusive", "NonExclusive"]).optional(),
  representationScope: z.enum(["Local", "International", "Both"]).optional(),
  baseSalary: z.number().positive().optional(),
  salaryCurrency: z.enum(["SAR", "USD", "EUR"]).optional(),
  signingBonus: z.number().min(0).optional(),
  releaseClause: z.number().positive().optional(),
  performanceBonus: z.number().min(0).optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  agentName: z.string().optional(),
  agentLicense: z.string().optional(),
  notes: z.string().optional(),
}).strict();

export const createContractTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  contractType: z.enum(CONTRACT_TYPES),
  category: z.enum(CATEGORIES),
  defaultValues: defaultValuesSchema.optional().default({}),
});

export const updateContractTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  nameAr: z.string().max(200).optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  category: z.enum(CATEGORIES).optional(),
  defaultValues: defaultValuesSchema.optional(),
  isActive: z.boolean().optional(),
});

export type CreateContractTemplateInput = z.infer<typeof createContractTemplateSchema>;
export type UpdateContractTemplateInput = z.infer<typeof updateContractTemplateSchema>;
