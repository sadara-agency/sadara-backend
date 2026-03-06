import { RolePermission } from "./permission.model";
import { RoleFieldPermission } from "./fieldPermission.model";
import { cacheGet, cacheSet, cacheDel, CacheTTL } from "../../shared/utils/cache";

// ── Types ──

export type CrudAction = "create" | "read" | "update" | "delete";

export interface ModulePermission {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

/** role → module → { canCreate, canRead, canUpdate, canDelete } */
export type PermissionMap = Record<string, Record<string, ModulePermission>>;

// ── Cache ──

const CACHE_KEY = "rbac:permissions";
let memoryCache: PermissionMap | null = null;

// ── Public API ──

/** Load all permissions from DB → memory + Redis cache. */
export async function loadPermissions(): Promise<PermissionMap> {
  const rows = await RolePermission.findAll({ raw: true });
  const map: PermissionMap = {};

  for (const row of rows) {
    if (!map[row.role]) map[row.role] = {};
    map[row.role][row.module] = {
      canCreate: row.canCreate,
      canRead: row.canRead,
      canUpdate: row.canUpdate,
      canDelete: row.canDelete,
    };
  }

  memoryCache = map;
  await cacheSet(CACHE_KEY, map, CacheTTL.HOUR);
  return map;
}

/** Get the full permission map (memory → Redis → DB). */
export async function getPermissions(): Promise<PermissionMap> {
  if (memoryCache) return memoryCache;

  const cached = await cacheGet<PermissionMap>(CACHE_KEY);
  if (cached) {
    memoryCache = cached;
    return cached;
  }

  return loadPermissions();
}

/** Check if a role has a specific CRUD action on a module. */
export async function hasPermission(
  role: string,
  module: string,
  action: CrudAction,
): Promise<boolean> {
  // Admin always has full access (safety net)
  if (role === "Admin") return true;

  const perms = await getPermissions();
  const mp = perms[role]?.[module];
  if (!mp) return false;

  switch (action) {
    case "create":
      return mp.canCreate;
    case "read":
      return mp.canRead;
    case "update":
      return mp.canUpdate;
    case "delete":
      return mp.canDelete;
    default:
      return false;
  }
}

/** Clear both in-memory and Redis caches (module + field permissions). */
export async function invalidatePermissionCache(): Promise<void> {
  memoryCache = null;
  fieldMemoryCache = null;
  await cacheDel(CACHE_KEY);
  await cacheDel(FIELD_CACHE_KEY);
}

// ══════════════════════════════════════════════════════════
// Field-Level Permissions
// ══════════════════════════════════════════════════════════

/** role → module → array of hidden field names */
export type FieldPermissionMap = Record<string, Record<string, string[]>>;

const FIELD_CACHE_KEY = "rbac:field-permissions";
let fieldMemoryCache: FieldPermissionMap | null = null;

/** Load all field permissions from DB → memory + Redis cache. */
export async function loadFieldPermissions(): Promise<FieldPermissionMap> {
  const rows = await RoleFieldPermission.findAll({
    where: { hidden: true },
    raw: true,
  });

  const map: FieldPermissionMap = {};
  for (const row of rows) {
    if (!map[row.role]) map[row.role] = {};
    if (!map[row.role][row.module]) map[row.role][row.module] = [];
    map[row.role][row.module].push(row.field);
  }

  fieldMemoryCache = map;
  await cacheSet(FIELD_CACHE_KEY, map, CacheTTL.HOUR);
  return map;
}

/** Get the full field permission map (memory → Redis → DB). */
export async function getFieldPermissions(): Promise<FieldPermissionMap> {
  if (fieldMemoryCache) return fieldMemoryCache;

  const cached = await cacheGet<FieldPermissionMap>(FIELD_CACHE_KEY);
  if (cached) {
    fieldMemoryCache = cached;
    return cached;
  }

  return loadFieldPermissions();
}

/** Get hidden field names for a specific role + module. Admin sees everything. */
export async function getHiddenFields(
  role: string,
  module: string,
): Promise<string[]> {
  if (role === "Admin") return [];
  const perms = await getFieldPermissions();
  return perms[role]?.[module] ?? [];
}
