/**
 * Player Package Access Configuration
 *
 * Defines which modules/features each player package tier can access.
 * Package A = Premium (full), B = Standard (core+), C = Basic (essential).
 *
 * Config is loaded from DB (package_configs table) with Redis caching.
 * Hardcoded defaults serve as fallback when DB is empty.
 */

import { cacheOrFetch } from "@shared/utils/cache";
import { logger } from "@config/logger";

export type PlayerPackage = "A" | "B" | "C";
export type CrudAction = "create" | "read" | "update" | "delete";

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

// ── Hardcoded Defaults (fallback when DB is empty) ──

const PACKAGE_C: Record<string, PackageModuleAccess> = {
  players: FULL,
  contracts: READ_ONLY,
  matches: READ_ONLY,
  calendar: READ_ONLY,
  notifications: FULL,
  messaging: FULL,
  documents: READ_ONLY,
  tickets: CREATE_READ,
  tasks: READ_ONLY,
};

const PACKAGE_B: Record<string, PackageModuleAccess> = {
  ...PACKAGE_C,
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
  C: PACKAGE_C,
  B: PACKAGE_B,
  A: {},
};

// ── DB-Driven Config (loaded lazily, cached 1hr) ──

let dbConfigLoaded = false;
let dbConfigMap: Record<PlayerPackage, Record<string, PackageModuleAccess>> = {
  A: {},
  B: {},
  C: {},
};

/**
 * Load package configs from DB into memory. Redis cached for 1hr.
 * Called lazily on first access check, or can be called at startup.
 */
export async function loadPackageConfigsFromDB(): Promise<void> {
  try {
    // Dynamic import to avoid circular dependency at module load time
    const { PackageConfig } =
      await import("@modules/packages/packageConfig.model");

    const rows = await PackageConfig.findAll();
    if (rows.length === 0) {
      // No DB config — use hardcoded defaults
      dbConfigLoaded = false;
      return;
    }

    const map: Record<PlayerPackage, Record<string, PackageModuleAccess>> = {
      A: {},
      B: {},
      C: {},
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
 * Package A always returns FULL. B and C return their configured access or NONE.
 */
export function getPackageAccess(
  pkg: PlayerPackage,
  module: string,
): PackageModuleAccess {
  if (pkg === "A") return FULL;

  // Use DB config if loaded, otherwise hardcoded defaults
  const configMap = dbConfigLoaded ? dbConfigMap : HARDCODED_MAP;
  return configMap[pkg]?.[module] ?? NONE;
}

/**
 * Check if a specific action is allowed for a module under a player package.
 */
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

/**
 * Get the full access map for a package (used by the API endpoint).
 */
export function getFullAccessMap(
  pkg: PlayerPackage,
): Record<string, PackageModuleAccess> {
  if (pkg === "A") {
    // Return explicit FULL for all known modules
    const allModules = new Set([
      ...Object.keys(PACKAGE_C),
      ...Object.keys(PACKAGE_B),
      "scouting",
      "finance",
      "esignatures",
      "media",
      "reports",
      "journey",
      "gates",
      "approvals",
      "clearances",
      "spl",
      "sportmonks",
      "integrations",
      "fitness",
    ]);

    // Also include any DB-configured modules
    if (dbConfigLoaded) {
      for (const pkg of Object.values(dbConfigMap)) {
        for (const mod of Object.keys(pkg)) {
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
