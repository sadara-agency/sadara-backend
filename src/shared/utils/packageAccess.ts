/**
 * Player Package Access Configuration
 *
 * Defines which modules/features each player package tier can access.
 * Package A = Premium (full), B = Standard (core+), C = Basic (essential).
 */

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

// ── Package C (Basic) ──
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

// ── Package B (Standard) — inherits C + additions ──
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

// ── Package A (Premium) — all modules full access ──
// No restrictions — returns FULL for any module

const PACKAGE_MAP: Record<
  PlayerPackage,
  Record<string, PackageModuleAccess>
> = {
  C: PACKAGE_C,
  B: PACKAGE_B,
  A: {}, // empty map = no restrictions (getPackageAccess returns FULL)
};

/**
 * Get the access level for a module given a player package.
 * Package A always returns FULL. B and C return their configured access or NONE.
 */
export function getPackageAccess(
  pkg: PlayerPackage,
  module: string,
): PackageModuleAccess {
  if (pkg === "A") return FULL;
  return PACKAGE_MAP[pkg]?.[module] ?? NONE;
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
    const map: Record<string, PackageModuleAccess> = {};
    for (const m of allModules) map[m] = FULL;
    return map;
  }
  return PACKAGE_MAP[pkg] ?? {};
}
