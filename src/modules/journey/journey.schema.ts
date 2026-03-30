import { z } from "zod";

// ── Shared constants ──
const STAGE_STATUSES = [
  "NotStarted",
  "InProgress",
  "Completed",
  "OnHold",
] as const;

const STAGE_HEALTH = ["OnTrack", "AtRisk", "Overdue", "Blocked"] as const;

// ── Create Journey Stage ──
export const createJourneySchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  stageName: z.string().min(1, "Stage name is required"),
  stageNameAr: z.string().optional(),
  stageOrder: z.number().int().min(0).default(0),
  status: z.enum(STAGE_STATUSES).default("NotStarted"),
  health: z.enum(STAGE_HEALTH).default("OnTrack"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  expectedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  assignedTo: z.string().uuid("Invalid user ID").optional(),
  responsibleParty: z.string().optional(),
  responsiblePartyAr: z.string().optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
});

// ── Update Journey Stage ──
export const updateJourneySchema = z.object({
  stageName: z.string().min(1).optional(),
  stageNameAr: z.string().nullable().optional(),
  stageOrder: z.number().int().min(0).optional(),
  status: z.enum(STAGE_STATUSES).optional(),
  health: z.enum(STAGE_HEALTH).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  expectedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  actualEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  assignedTo: z.string().uuid("Invalid user ID").nullable().optional(),
  responsibleParty: z.string().nullable().optional(),
  responsiblePartyAr: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  notesAr: z.string().nullable().optional(),
});

// ── Query ──
export const journeyQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  playerId: z.string().uuid().optional(),
  status: z.enum(STAGE_STATUSES).optional(),
  health: z.enum(STAGE_HEALTH).optional(),
  assignedTo: z.string().uuid().optional(),
  sort: z
    .enum([
      "stage_order",
      "start_date",
      "expected_end_date",
      "created_at",
      "status",
    ])
    .default("stage_order"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

// ── Reorder stages ──
export const reorderStagesSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  stageIds: z.array(z.string().uuid()).min(1, "At least one stage ID required"),
});

// ── Inferred types ──
export type CreateJourneyInput = z.infer<typeof createJourneySchema>;
export type UpdateJourneyInput = z.infer<typeof updateJourneySchema>;
export type JourneyQuery = z.infer<typeof journeyQuerySchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;
