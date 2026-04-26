import { z } from "zod";

// ── Shared constants ──
const STAGE_STATUSES = [
  "NotStarted",
  "InProgress",
  "Completed",
  "OnHold",
] as const;

const STAGE_HEALTH = ["OnTrack", "AtRisk", "Overdue", "Blocked"] as const;

const STAGE_TYPES = [
  "PhysicalTraining",
  "TechnicalTraining",
  "TacticalTraining",
  "Assessment",
  "Recovery",
  "MentalDevelopment",
  "General",
] as const;

// ── Stage Owner (Specialist Roles) ──
const STAGE_OWNERS = [
  "FitnessCoach", // المعد البدني
  "Coach", // المدرب الميداني
  "SkillCoach", // المدرب المهاري
  "TacticalCoach", // المدرب التكتيكي
  "Analyst", // محلل الأداء
  "NutritionSpecialist", // أخصائي التغذية
  "MentalCoach", // الأخصائي النفسي
  "Manager", // المدير الرياضي (fallback)
] as const;

// ── Evolution Phases (Career Progression) ──
const EVOLUTION_PHASES = [
  "Diagnostic",
  "Foundation",
  "Integration",
  "Mastery",
] as const;

// ── Stage Type → Owner Mapping (enforces specialty separation) ──
const STAGE_OWNER_MAP: Record<
  (typeof STAGE_TYPES)[number],
  (typeof STAGE_OWNERS)[number][]
> = {
  PhysicalTraining: ["FitnessCoach"],
  TechnicalTraining: ["Coach", "SkillCoach"],
  TacticalTraining: ["TacticalCoach", "Coach"],
  Assessment: ["Analyst"],
  Recovery: ["FitnessCoach"],
  MentalDevelopment: ["MentalCoach"],
  General: ["Manager", "Analyst"],
};

// ── Create Journey Stage ──
export const createJourneySchema = z
  .object({
    playerId: z.string().uuid("Invalid player ID"),
    gateId: z.string().uuid("Invalid gate ID").nullable().optional(),
    stageName: z.string().min(1, "Stage name is required"),
    stageNameAr: z.string().optional(),
    stageOrder: z.number().int().min(0).default(0),
    status: z.enum(STAGE_STATUSES).default("NotStarted"),
    health: z.enum(STAGE_HEALTH).default("OnTrack"),
    stageType: z.enum(STAGE_TYPES).default("General"),
    stageOwner: z.enum(STAGE_OWNERS, {
      errorMap: () => ({ message: "Invalid specialist role for this stage" }),
    }),
    phase: z.enum(EVOLUTION_PHASES).nullable().optional(),
    evolutionCycleId: z
      .string()
      .uuid("Invalid evolution cycle ID")
      .nullable()
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
    expectedEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
    assignedTo: z.string().uuid("Invalid user ID").optional(),
    referralId: z.string().uuid("Invalid referral ID").optional(),
    responsibleParty: z.string().optional(),
    responsiblePartyAr: z.string().optional(),
    blockerDescription: z.string().optional(),
    targetKpi: z.string().max(500).optional(),
    notes: z.string().optional(),
    notesAr: z.string().optional(),
  })
  .refine(
    (data) => {
      // Validate that stageOwner is allowed for the stageType
      const allowedOwners = STAGE_OWNER_MAP[data.stageType];
      return allowedOwners.includes(data.stageOwner);
    },
    {
      message: "Selected specialist role is not allowed for this stage type",
      path: ["stageOwner"],
    },
  );

// ── Update Journey Stage ──
export const updateJourneySchema = z
  .object({
    gateId: z.string().uuid("Invalid gate ID").nullable().optional(),
    stageName: z.string().min(1).optional(),
    stageNameAr: z.string().nullable().optional(),
    stageOrder: z.number().int().min(0).optional(),
    status: z.enum(STAGE_STATUSES).optional(),
    health: z.enum(STAGE_HEALTH).optional(),
    stageType: z.enum(STAGE_TYPES).optional(),
    stageOwner: z
      .enum(STAGE_OWNERS, {
        errorMap: () => ({ message: "Invalid specialist role for this stage" }),
      })
      .optional(),
    phase: z.enum(EVOLUTION_PHASES).nullable().optional(),
    evolutionCycleId: z
      .string()
      .uuid("Invalid evolution cycle ID")
      .nullable()
      .optional(),
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
    referralId: z.string().uuid("Invalid referral ID").nullable().optional(),
    responsibleParty: z.string().nullable().optional(),
    responsiblePartyAr: z.string().nullable().optional(),
    blockerDescription: z.string().nullable().optional(),
    targetKpi: z.string().max(500).nullable().optional(),
    notes: z.string().nullable().optional(),
    notesAr: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      // If both stageType and stageOwner are provided, validate the combination
      if (data.stageType && data.stageOwner) {
        const allowedOwners = STAGE_OWNER_MAP[data.stageType];
        return allowedOwners.includes(data.stageOwner);
      }
      // If only one is provided, validation passes
      return true;
    },
    {
      message: "Selected specialist role is not allowed for this stage type",
      path: ["stageOwner"],
    },
  );

// ── Query ──
export const journeyQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(50),
  playerId: z.string().uuid().optional(),
  gateId: z.string().uuid().optional(),
  status: z.enum(STAGE_STATUSES).optional(),
  health: z.enum(STAGE_HEALTH).optional(),
  stageType: z.enum(STAGE_TYPES).optional(),
  phase: z.enum(EVOLUTION_PHASES).optional(),
  evolutionCycleId: z.string().uuid().optional(),
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
