import { z } from "zod";

// ── Shared constants ──
const EVOLUTION_TIERS = [
  "StrugglingTalent",
  "DevelopingPerformer",
  "MatchReadyPro",
  "PeakPerformer",
] as const;

const EVOLUTION_PHASES = [
  "Diagnostic",
  "Foundation",
  "Integration",
  "Mastery",
] as const;

const CYCLE_STATUSES = ["Active", "Completed", "Paused"] as const;

const targetKpiSchema = z.object({
  metric: z.string().min(1, "Metric name is required"),
  metricAr: z.string().optional(),
  baseline: z.string().min(1, "Baseline value is required"),
  target: z.string().min(1, "Target value is required"),
  current: z.string().optional(),
});

// ── Create ──
export const createEvolutionCycleSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  name: z.string().min(1, "Cycle name is required").max(255),
  nameAr: z.string().max(255).optional(),
  blockerSummary: z.string().optional(),
  blockerSummaryAr: z.string().optional(),
  tier: z.enum(EVOLUTION_TIERS).default("StrugglingTalent"),
  currentPhase: z.enum(EVOLUTION_PHASES).default("Diagnostic"),
  status: z.enum(CYCLE_STATUSES).default("Active"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  expectedEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  targetKpis: z.array(targetKpiSchema).optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
});

// ── Update ──
export const updateEvolutionCycleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  blockerSummary: z.string().nullable().optional(),
  blockerSummaryAr: z.string().nullable().optional(),
  tier: z.enum(EVOLUTION_TIERS).optional(),
  currentPhase: z.enum(EVOLUTION_PHASES).optional(),
  status: z.enum(CYCLE_STATUSES).optional(),
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
  targetKpis: z.array(targetKpiSchema).nullable().optional(),
  notes: z.string().nullable().optional(),
  notesAr: z.string().nullable().optional(),
});

// ── Query ──
export const evolutionCycleQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  playerId: z.string().uuid().optional(),
  status: z.enum(CYCLE_STATUSES).optional(),
  tier: z.enum(EVOLUTION_TIERS).optional(),
  currentPhase: z.enum(EVOLUTION_PHASES).optional(),
  sort: z
    .enum(["created_at", "start_date", "expected_end_date", "tier", "status"])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// ── Advance Phase ──
export const advancePhaseSchema = z.object({
  nextPhase: z.enum(EVOLUTION_PHASES),
});

// ── Inferred types ──
export type CreateEvolutionCycleInput = z.infer<
  typeof createEvolutionCycleSchema
>;
export type UpdateEvolutionCycleInput = z.infer<
  typeof updateEvolutionCycleSchema
>;
export type EvolutionCycleQuery = z.infer<typeof evolutionCycleQuerySchema>;
export type AdvancePhaseInput = z.infer<typeof advancePhaseSchema>;

// Re-export constants for use in other modules
export { EVOLUTION_TIERS, EVOLUTION_PHASES, CYCLE_STATUSES };
