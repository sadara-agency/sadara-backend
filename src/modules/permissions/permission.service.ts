import { RolePermission } from "@modules/permissions/permission.model";
import { RoleFieldPermission } from "@modules/permissions/fieldPermission.model";
import { ConfigurableField } from "@modules/permissions/configurableField.model";
import { CONFIGURABLE_FIELDS } from "@modules/permissions/fieldPermission.config";
import { cacheGet, cacheSet, cacheDel, CacheTTL } from "@shared/utils/cache";
import { verifyUserRole } from "@shared/utils/verifyRole";

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
let memoryCacheTimestamp = 0;
const MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour — matches Redis TTL

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
  memoryCacheTimestamp = Date.now();
  await cacheSet(CACHE_KEY, map, CacheTTL.HOUR);
  return map;
}

/** Get the full permission map (memory → Redis → DB). */
export async function getPermissions(): Promise<PermissionMap> {
  if (memoryCache && Date.now() - memoryCacheTimestamp < MEMORY_TTL_MS) {
    return memoryCache;
  }

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
  userId?: string,
): Promise<boolean> {
  // Admin always has full access, but verify the role is current in DB
  if (role === "Admin") {
    if (userId) await verifyUserRole(userId, "Admin");
    return true;
  }

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

/** Clear all in-memory and Redis caches (module + field perms + configurable fields). */
export async function invalidatePermissionCache(): Promise<void> {
  memoryCache = null;
  memoryCacheTimestamp = 0;
  fieldMemoryCache = null;
  fieldMemoryCacheTimestamp = 0;
  configFieldsMemoryCache = null;
  configFieldsMemoryCacheTimestamp = 0;
  await cacheDel(CACHE_KEY);
  await cacheDel(FIELD_CACHE_KEY);
  await cacheDel(CONFIG_FIELDS_CACHE_KEY);
}

// ══════════════════════════════════════════════════════════
// Field-Level Permissions
// ══════════════════════════════════════════════════════════

/** role → module → array of hidden field names */
export type FieldPermissionMap = Record<string, Record<string, string[]>>;

const FIELD_CACHE_KEY = "rbac:field-permissions";
let fieldMemoryCache: FieldPermissionMap | null = null;
let fieldMemoryCacheTimestamp = 0;

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
  fieldMemoryCacheTimestamp = Date.now();
  await cacheSet(FIELD_CACHE_KEY, map, CacheTTL.HOUR);
  return map;
}

/** Get the full field permission map (memory → Redis → DB). */
export async function getFieldPermissions(): Promise<FieldPermissionMap> {
  if (
    fieldMemoryCache &&
    Date.now() - fieldMemoryCacheTimestamp < MEMORY_TTL_MS
  ) {
    return fieldMemoryCache;
  }

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
  userId?: string,
): Promise<string[]> {
  if (role === "Admin") {
    if (userId) await verifyUserRole(userId, "Admin");
    return [];
  }
  const perms = await getFieldPermissions();
  return perms[role]?.[module] ?? [];
}

// ══════════════════════════════════════════════════════════
// Configurable Fields (which fields per module may be hidden)
// ══════════════════════════════════════════════════════════

/** module → array of { field, label } that can be toggled per role */
export type ConfigurableFieldsMap = Record<
  string,
  Array<{ field: string; label: string }>
>;

const CONFIG_FIELDS_CACHE_KEY = "rbac:configurable-fields";
let configFieldsMemoryCache: ConfigurableFieldsMap | null = null;
let configFieldsMemoryCacheTimestamp = 0;

/** Load configurable fields from DB → memory + Redis cache. Empty DB → in-code fallback. */
export async function loadConfigurableFields(): Promise<ConfigurableFieldsMap> {
  const rows = await ConfigurableField.findAll({
    order: [
      ["module", "ASC"],
      ["sortOrder", "ASC"],
    ],
    raw: true,
  });

  let map: ConfigurableFieldsMap;
  if (rows.length === 0) {
    // Table not yet seeded (e.g. deploy landed before migration) — fall back
    // to the in-code constant so the endpoint never regresses.
    map = {};
    for (const [module, fields] of Object.entries(CONFIGURABLE_FIELDS)) {
      map[module] = fields.map((f) => ({ field: f.field, label: f.label }));
    }
  } else {
    map = {};
    for (const row of rows) {
      if (!map[row.module]) map[row.module] = [];
      map[row.module].push({ field: row.field, label: row.label });
    }
  }

  configFieldsMemoryCache = map;
  configFieldsMemoryCacheTimestamp = Date.now();
  await cacheSet(CONFIG_FIELDS_CACHE_KEY, map, CacheTTL.HOUR);
  return map;
}

/** Get the configurable-fields map (memory → Redis → DB → in-code fallback). */
export async function getConfigurableFields(): Promise<ConfigurableFieldsMap> {
  if (
    configFieldsMemoryCache &&
    Date.now() - configFieldsMemoryCacheTimestamp < MEMORY_TTL_MS
  ) {
    return configFieldsMemoryCache;
  }

  const cached = await cacheGet<ConfigurableFieldsMap>(CONFIG_FIELDS_CACHE_KEY);
  if (cached) {
    configFieldsMemoryCache = cached;
    return cached;
  }

  return loadConfigurableFields();
}
