import { z } from "zod";

const ROLES = [
  "Admin",
  "Manager",
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
  "Media",
  "Executive",
  "GoalkeeperCoach",
  "MentalCoach",
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
  "media_requests",
  "press_releases",
  "media_contacts",
  "media_kits",
  "social_media",
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
      .max(1000), // 17 roles × 51 modules
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

export { ROLES, MODULES };
