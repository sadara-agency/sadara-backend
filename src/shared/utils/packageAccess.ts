/**
 * Player Package Access Configuration
 *
 * Defines which modules/features each player package tier can access.
 * Tiers (per v2.0 framework):
 *   - B  (Foundational)            — entry-level
 *   - B+ (Ascent / Emerging Pro)
 *   - A  (Elite)                    — full module access
 *   - A+ (World-Class Elite)        — full module access, capped slots
 *
 * Config is loaded from DB (`package_configs` table) with Redis caching.
 * Hardcoded defaults serve as fallback when DB is empty.
 */

import { logger } from "@config/logger";

export type PlayerPackage = "A+" | "A" | "B+" | "B";
export type CrudAction = "create" | "read" | "update" | "delete";

export const PLAYER_PACKAGES: readonly PlayerPackage[] = [
  "A+",
  "A",
  "B+",
  "B",
] as const;

export interface PackageModuleAccess {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

const FULL: PackageModuleAccess = {
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true,
};
const READ_ONLY: PackageModuleAccess = {
  canCreate: false,
  canRead: true,
  canUpdate: false,
  canDelete: false,
};
const CREATE_READ: PackageModuleAccess = {
  canCreate: true,
  canRead: true,
  canUpdate: false,
  canDelete: false,
};
const NONE: PackageModuleAccess = {
  canCreate: false,
  canRead: false,
  canUpdate: false,
  canDelete: false,
};

// ── Hardcoded Defaults (fallback when DB cache misses) ──

const PACKAGE_B: Record<string, PackageModuleAccess> = {
  players: FULL,
  contracts: READ_ONLY,
  matches: READ_ONLY,
  calendar: READ_ONLY,
  documents: READ_ONLY,
  tasks: READ_ONLY,
  tickets: CREATE_READ,
  messaging: FULL,
  notifications: FULL,
};

const PACKAGE_BPLUS: Record<string, PackageModuleAccess> = {
  ...PACKAGE_B,
  sessions: CREATE_READ,
  referrals: CREATE_READ,
  wellness: CREATE_READ,
  injuries: FULL,
  training: READ_ONLY,
  calendar: FULL,
  documents: CREATE_READ,
  tasks: FULL,
  notes: FULL,
  tickets: FULL,
  matches: CREATE_READ,
};

const HARDCODED_MAP: Record<
  PlayerPackage,
  Record<string, PackageModuleAccess>
> = {
  B: PACKAGE_B,
  "B+": PACKAGE_BPLUS,
  A: {}, // sentinel — A returns FULL for any module
  "A+": {}, // sentinel — A+ returns FULL for any module
};

// ── DB-Driven Config (loaded lazily) ──

let dbConfigLoaded = false;
let dbConfigMap: Record<PlayerPackage, Record<string, PackageModuleAccess>> = {
  "A+": {},
  A: {},
  "B+": {},
  B: {},
};

export async function loadPackageConfigsFromDB(): Promise<void> {
  try {
    const { PackageConfig } =
      await import("@modules/packages/packageConfig.model");

    const rows = await PackageConfig.findAll();
    if (rows.length === 0) {
      dbConfigLoaded = false;
      return;
    }

    const map: Record<PlayerPackage, Record<string, PackageModuleAccess>> = {
      "A+": {},
      A: {},
      "B+": {},
      B: {},
    };

    for (const row of rows) {
      const pkg = row.package as PlayerPackage;
      if (map[pkg]) {
        map[pkg][row.module] = {
          canCreate: row.canCreate,
          canRead: row.canRead,
          canUpdate: row.canUpdate,
          canDelete: row.canDelete,
        };
      }
    }

    dbConfigMap = map;
    dbConfigLoaded = true;
    logger.info(`Loaded ${rows.length} package config entries from DB`);
  } catch (err) {
    logger.warn(
      "Failed to load package configs from DB, using hardcoded defaults",
    );
    dbConfigLoaded = false;
  }
}

/**
 * Get the access level for a module given a player package.
 * A and A+ tiers always return FULL (apex tiers, full platform access).
 */
export function getPackageAccess(
  pkg: PlayerPackage,
  module: string,
): PackageModuleAccess {
  if (pkg === "A" || pkg === "A+") return FULL;

  const configMap = dbConfigLoaded ? dbConfigMap : HARDCODED_MAP;
  return configMap[pkg]?.[module] ?? NONE;
}

export function isModuleAllowed(
  pkg: PlayerPackage,
  module: string,
  action: CrudAction,
): boolean {
  const access = getPackageAccess(pkg, module);
  switch (action) {
    case "create":
      return access.canCreate;
    case "read":
      return access.canRead;
    case "update":
      return access.canUpdate;
    case "delete":
      return access.canDelete;
    default:
      return false;
  }
}

export function getFullAccessMap(
  pkg: PlayerPackage,
): Record<string, PackageModuleAccess> {
  if (pkg === "A" || pkg === "A+") {
    const allModules = new Set([
      ...Object.keys(PACKAGE_B),
      ...Object.keys(PACKAGE_BPLUS),
      "scouting",
      "finance",
      "esignatures",
      "reports",
      "journey",
      "gates",
      "approvals",
      "spl",
      "sportmonks",
      "integrations",
      "fitness",
    ]);

    if (dbConfigLoaded) {
      for (const tierMap of Object.values(dbConfigMap)) {
        for (const mod of Object.keys(tierMap)) {
          allModules.add(mod);
        }
      }
    }

    const map: Record<string, PackageModuleAccess> = {};
    for (const m of allModules) map[m] = FULL;
    return map;
  }

  const configMap = dbConfigLoaded ? dbConfigMap : HARDCODED_MAP;
  return configMap[pkg] ?? {};
}
