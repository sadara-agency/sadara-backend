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

const moduleAccessSchema = z.object({
  module: z.enum(KNOWN_MODULES),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});

export const updatePackageConfigSchema = z.object({
  package: z.enum(["A", "B", "C"]),
  modules: z.array(moduleAccessSchema).min(1),
});

export const updatePlayerPackageSchema = z.object({
  playerPackage: z.enum(["A", "B", "C"]),
});

export type UpdatePackageConfigDTO = z.infer<typeof updatePackageConfigSchema>;
export type UpdatePlayerPackageDTO = z.infer<typeof updatePlayerPackageSchema>;
