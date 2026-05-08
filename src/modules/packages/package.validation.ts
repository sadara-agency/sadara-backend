import { z } from "zod";

// All modules registered in app.ts — used to prevent arbitrary module names
const KNOWN_MODULES = [
  "approvals",
  "audit",
  "auth",
  "calendar",
  "clubs",
  "competitions",
  "contracts",
  "dashboard",
  "documents",
  "esignatures",
  "finance",
  "gates",
  "gdpr",
  "injuries",
  "integrations",
  "journey",
  "matches",
  "media",
  "mental",
  "notes",
  "notifications",
  "offers",
  "packages",
  "permissions",
  "playercare",
  "players",
  "portal",
  "referrals",
  "reports",
  "saff",
  "scouting",
  "sessions",
  "settings",
  "spl",
  "sportmonks",
  "tasks",
  "tickets",
  "training",
  "users",
  "wellness",
] as const;

export const PACKAGE_CODES = ["A+", "A", "B+", "B"] as const;

const moduleAccessSchema = z.object({
  module: z.enum(KNOWN_MODULES),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});

export const updatePackageConfigSchema = z.object({
  package: z.enum(PACKAGE_CODES),
  modules: z.array(moduleAccessSchema).min(1),
});

export const updatePlayerPackageSchema = z.object({
  playerPackage: z.enum(PACKAGE_CODES),
});

const trackBulletsSchema = z
  .object({
    en: z.array(z.string()).optional(),
    ar: z.array(z.string()).optional(),
  })
  .optional();

export const updatePackageTierSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    nameAr: z.string().max(100).nullable().optional(),
    description: z.string().nullable().optional(),
    taglineEn: z.string().nullable().optional(),
    taglineAr: z.string().nullable().optional(),
    feeMin: z.number().int().nonnegative().nullable().optional(),
    feeMax: z.number().int().nonnegative().nullable().optional(),
    commissionPct: z.number().min(0).max(100).nullable().optional(),
    tracks: z
      .object({
        career: trackBulletsSchema,
        performance: trackBulletsSchema,
        brand: trackBulletsSchema,
        wealth: trackBulletsSchema,
      })
      .nullable()
      .optional(),
    maxPlayers: z.number().int().positive().nullable().optional(),
    displayOrder: z.number().int().nonnegative().optional(),
  })
  .strict();

export type UpdatePackageConfigDTO = z.infer<typeof updatePackageConfigSchema>;
export type UpdatePlayerPackageDTO = z.infer<typeof updatePlayerPackageSchema>;
export type UpdatePackageTierDTO = z.infer<typeof updatePackageTierSchema>;
