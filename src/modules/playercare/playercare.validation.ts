import { z } from "zod";

// ── Query (list cases) ──

export const playerCareQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  category: z
    .enum([
      "Performance",
      "Physical",
      "Skill",
      "Tactical",
      "Mental",
      "Nutrition",
      "Medical",
      "Administrative",
      "SportDecision",
      "Goalkeeper",
    ])
    .optional(),
  status: z.enum(["Open", "InProgress", "Waiting", "Closed"]).optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  playerId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
  sort: z.enum(["createdAt", "status", "priority"]).default("createdAt"),
  order: z.enum(["ASC", "DESC"]).default("DESC"),
});

// ── Create Performance/Mental Case ──

export const createCaseSchema = z.object({
  caseType: z.enum(["Performance", "Mental"]),
  playerId: z.string().uuid(),
  triggerDesc: z.string().min(1, "Description is required"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  assignedTo: z.string().uuid().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional(),
  restrictedTo: z.array(z.string().uuid()).optional(),
  resultingTicketId: z.string().uuid().optional(),
});

// ── Create Medical Case (injury + case in one) ──

export const createMedicalCaseSchema = z.object({
  // Case fields
  playerId: z.string().uuid(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().optional(),
  // Injury fields
  matchId: z.string().uuid().optional(),
  injuryType: z.string().min(1, "Injury type is required"),
  injuryTypeAr: z.string().optional(),
  bodyPart: z.string().min(1, "Body part is required"),
  bodyPartAr: z.string().optional(),
  severity: z
    .enum(["Minor", "Moderate", "Severe", "Critical"])
    .default("Moderate"),
  cause: z
    .enum(["Training", "Match", "NonFootball", "Unknown"])
    .default("Unknown"),
  injuryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  expectedReturnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  estimatedDaysOut: z.coerce.number().int().optional(),
  diagnosis: z.string().optional(),
  diagnosisAr: z.string().optional(),
  treatment: z.string().optional(),
  treatmentPlan: z.string().optional(),
  treatmentPlanAr: z.string().optional(),
  medicalProvider: z.string().optional(),
  surgeonName: z.string().optional(),
  isSurgeryRequired: z.boolean().default(false),
  surgeryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  injuryNotes: z.string().optional(),
});

// ── Update Case ──

export const updateCaseSchema = z.object({
  triggerDesc: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  resultingTicketId: z.string().uuid().nullable().optional(),
});

// ── Update Case Status ──

export const updateCaseStatusSchema = z.object({
  status: z.enum(["Open", "InProgress", "Waiting", "Closed"]),
  closureNotes: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});

// ── Params ──

export const caseIdSchema = z.object({
  id: z.string().uuid(),
});

export const playerIdSchema = z.object({
  playerId: z.string().uuid(),
});

// ── Types ──

export type PlayerCareQuery = z.infer<typeof playerCareQuerySchema>;
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type CreateMedicalCaseInput = z.infer<typeof createMedicalCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type UpdateCaseStatusInput = z.infer<typeof updateCaseStatusSchema>;
