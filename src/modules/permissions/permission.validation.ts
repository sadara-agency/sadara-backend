import { z } from "zod";

const ROLES = [
  "Admin",
  "Manager",
  "SportingDirector",
  "Executive",
  "Analyst",
  "Scout",
  "Player",
  "Legal",
  "Finance",
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GraphicDesigner",
  "GoalkeeperCoach",
  "MentalCoach",
  "ContentManager",
  "Approver",
  "Publisher",
  "Partner",
  "PipelineManager",
] as const;

const MODULES = [
  "dashboard",
  "matches",
  "players",
  "clubs",
  "scouting",
  "referrals",
  "contracts",
  "offers",
  "gates",
  "approvals",
  "injuries",
  "training",
  "finance",
  "reports",
  "tasks",
  "notifications",
  "documents",
  "audit",
  "market-intel",
  "settings",
  "users",
  "sportmonks",
  "saff-data",
  "spl-sync",
  "sessions",
  "wellness",
  "calendar",
  "competitions",
  "journey",
  "tickets",
  "messaging",
  "session-feedback",
  "notes",
  "meal-plans",
  "rtp",
  "tactical",
  "match-analytics",
  "injury-financials",
  "training-plans",
  "dev-reviews",
  "mental",
  "video",
  "transfer-windows",
  "club-needs",
  "player-coach-assignments",
  "staffMonitoring",
  "designs",
  "heatmaps",
  "workout-plans",
  "player-inbox",
  "partners",
  "pipeline",
] as const;

export const updatePermissionsSchema = z.object({
  body: z.object({
    permissions: z
      .array(
        z.object({
          role: z.enum(ROLES),
          module: z.enum(MODULES),
          canCreate: z.boolean(),
          canRead: z.boolean(),
          canUpdate: z.boolean(),
          canDelete: z.boolean(),
        }),
      )
      .min(1)
      .max(1500), // 21 roles × 51 modules
  }),
});

export const updateFieldPermissionsSchema = z.object({
  body: z.object({
    fieldPermissions: z
      .array(
        z.object({
          role: z.enum(ROLES),
          module: z.enum(MODULES),
          field: z.string().min(1).max(100),
          hidden: z.boolean(),
        }),
      )
      .min(1)
      .max(1000),
  }),
});

export const upsertConfigurableFieldSchema = z.object({
  body: z.object({
    module: z.enum(MODULES),
    field: z.string().min(1).max(100),
    label: z.string().min(1).max(150),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  }),
});

export const deleteConfigurableFieldSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export { ROLES, MODULES };
