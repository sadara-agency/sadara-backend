import { RolePermission } from "./permission.model";
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

/** Clear both in-memory and Redis caches. */
export async function invalidatePermissionCache(): Promise<void> {
  memoryCache = null;
  await cacheDel(CACHE_KEY);
}
