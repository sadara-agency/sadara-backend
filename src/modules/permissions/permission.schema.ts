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
  "Media",
  "Executive",
  "GymCoach",
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
  "saff-data",
  "spl-sync",
  "gym",
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
      .max(253), // 11 roles × 23 modules
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
