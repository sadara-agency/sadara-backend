/**
 * Unit tests for permission.service.ts
 *
 * Tests cover:
 *  - loadPermissions (module-level)
 *  - getPermissions (memory -> Redis -> DB cache cascade)
 *  - hasPermission (role-based CRUD checks, Admin bypass)
 *  - invalidatePermissionCache (clears both caches)
 *  - loadFieldPermissions (field-level)
 *  - getFieldPermissions (memory -> Redis -> DB cache cascade)
 *  - getHiddenFields (role+module lookup, Admin bypass)
 */

// ── Mocks ──

jest.mock("@modules/permissions/permission.model", () => ({
  RolePermission: { findAll: jest.fn() },
}));

jest.mock("@modules/permissions/fieldPermission.model", () => ({
  RoleFieldPermission: { findAll: jest.fn() },
}));

const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
const mockCacheDel = jest.fn();

jest.mock("@shared/utils/cache", () => ({
  cacheGet: (...args: any[]) => mockCacheGet(...args),
  cacheSet: (...args: any[]) => mockCacheSet(...args),
  cacheDel: (...args: any[]) => mockCacheDel(...args),
  CacheTTL: { HOUR: 3600 },
}));

import { RolePermission } from "@modules/permissions/permission.model";
import { RoleFieldPermission } from "@modules/permissions/fieldPermission.model";
import {
  loadPermissions,
  getPermissions,
  hasPermission,
  invalidatePermissionCache,
  loadFieldPermissions,
  getFieldPermissions,
  getHiddenFields,
} from "@modules/permissions/permission.service";

// ── Helpers ──

const mockFindAll = RolePermission.findAll as jest.Mock;
const mockFieldFindAll = RoleFieldPermission.findAll as jest.Mock;

/** Sample module-level permission rows */
const samplePermissionRows = [
  {
    role: "Scout",
    module: "players",
    canCreate: true,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "Scout",
    module: "contracts",
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
  },
  {
    role: "Agent",
    module: "players",
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: false,
  },
];

/** Sample field-level permission rows (only hidden=true rows) */
const sampleFieldRows = [
  { role: "Scout", module: "players", field: "salary", hidden: true },
  { role: "Scout", module: "players", field: "passport_number", hidden: true },
  { role: "Scout", module: "contracts", field: "value", hidden: true },
  { role: "Agent", module: "finance", field: "commission", hidden: true },
];

// ── Reset internal module state between tests ──

/**
 * The service has module-scoped `memoryCache` variables.
 * To properly isolate tests we re-import the module each time
 * OR call invalidatePermissionCache() which resets all internal state.
 */
beforeEach(async () => {
  mockFindAll.mockReset();
  mockFieldFindAll.mockReset();
  mockCacheGet.mockReset();
  mockCacheSet.mockReset();
  mockCacheDel.mockReset();

  // Reset internal memory caches
  await invalidatePermissionCache();
});

// ══════════════════════════════════════════════
// Module-Level Permissions
// ══════════════════════════════════════════════

describe("loadPermissions", () => {
  it("should fetch all rows from DB and build a PermissionMap", async () => {
    mockFindAll.mockResolvedValue(samplePermissionRows);
    mockCacheSet.mockResolvedValue(true);

    const result = await loadPermissions();

    expect(mockFindAll).toHaveBeenCalledWith({ raw: true });
    expect(result).toEqual({
      Scout: {
        players: {
          canCreate: true,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
        contracts: {
          canCreate: false,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
      },
      Agent: {
        players: {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: false,
        },
      },
    });
  });

  it("should store the result in Redis with HOUR TTL", async () => {
    mockFindAll.mockResolvedValue(samplePermissionRows);
    mockCacheSet.mockResolvedValue(true);

    await loadPermissions();

    expect(mockCacheSet).toHaveBeenCalledWith(
      "rbac:permissions",
      expect.any(Object),
      3600,
    );
  });

  it("should return empty map when no rows exist", async () => {
    mockFindAll.mockResolvedValue([]);
    mockCacheSet.mockResolvedValue(true);

    const result = await loadPermissions();

    expect(result).toEqual({});
  });
});

describe("getPermissions", () => {
  it("should return from memory cache on second call (cache hit)", async () => {
    mockFindAll.mockResolvedValue(samplePermissionRows);
    mockCacheSet.mockResolvedValue(true);

    // First call: loads from DB
    const first = await getPermissions();
    expect(mockFindAll).toHaveBeenCalledTimes(1);

    // Second call: should NOT hit DB again
    const second = await getPermissions();
    expect(mockFindAll).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("should fall back to Redis when memory cache is empty", async () => {
    const cachedMap = {
      Scout: {
        players: {
          canCreate: true,
          canRead: true,
          canUpdate: false,
          canDelete: false,
        },
      },
    };
    mockCacheGet.mockResolvedValue(cachedMap);

    const result = await getPermissions();

    expect(mockCacheGet).toHaveBeenCalledWith("rbac:permissions");
    expect(result).toEqual(cachedMap);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("should fall back to DB when both memory and Redis miss", async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindAll.mockResolvedValue(samplePermissionRows);
    mockCacheSet.mockResolvedValue(true);

    const result = await getPermissions();

    expect(mockCacheGet).toHaveBeenCalledWith("rbac:permissions");
    expect(mockFindAll).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("Scout");
    expect(result).toHaveProperty("Agent");
  });
});

describe("hasPermission", () => {
  beforeEach(async () => {
    mockFindAll.mockResolvedValue(samplePermissionRows);
    mockCacheSet.mockResolvedValue(true);
    mockCacheGet.mockResolvedValue(null);
    // Prime the cache
    await loadPermissions();
  });

  it("should always return true for Admin role", async () => {
    expect(await hasPermission("Admin", "players", "create")).toBe(true);
    expect(await hasPermission("Admin", "players", "delete")).toBe(true);
    expect(await hasPermission("Admin", "nonexistent", "read")).toBe(true);
    // Admin bypass should not even consult the cache
  });

  it("should return true when role has the requested action", async () => {
    expect(await hasPermission("Scout", "players", "create")).toBe(true);
    expect(await hasPermission("Scout", "players", "read")).toBe(true);
    expect(await hasPermission("Agent", "players", "update")).toBe(true);
  });

  it("should return false when role lacks the requested action", async () => {
    expect(await hasPermission("Scout", "players", "update")).toBe(false);
    expect(await hasPermission("Scout", "players", "delete")).toBe(false);
    expect(await hasPermission("Agent", "players", "delete")).toBe(false);
  });

  it("should return false for unknown role", async () => {
    expect(await hasPermission("UnknownRole", "players", "read")).toBe(false);
  });

  it("should return false for unknown module", async () => {
    expect(await hasPermission("Scout", "nonexistent", "read")).toBe(false);
  });

  it("should return false for unknown action", async () => {
    expect(
      await hasPermission("Scout", "players", "explode" as any),
    ).toBe(false);
  });

  it("should check all four CRUD actions correctly", async () => {
    // Scout on contracts: only read
    expect(await hasPermission("Scout", "contracts", "create")).toBe(false);
    expect(await hasPermission("Scout", "contracts", "read")).toBe(true);
    expect(await hasPermission("Scout", "contracts", "update")).toBe(false);
    expect(await hasPermission("Scout", "contracts", "delete")).toBe(false);
  });
});

describe("invalidatePermissionCache", () => {
  it("should clear both Redis cache keys", async () => {
    mockCacheDel.mockResolvedValue(true);

    // Clear counts from beforeEach invalidation
    mockCacheDel.mockClear();

    await invalidatePermissionCache();

    expect(mockCacheDel).toHaveBeenCalledWith("rbac:permissions");
    expect(mockCacheDel).toHaveBeenCalledWith("rbac:field-permissions");
    expect(mockCacheDel).toHaveBeenCalledTimes(2);
  });

  it("should force next getPermissions call to reload from DB", async () => {
    mockFindAll.mockResolvedValue(samplePermissionRows);
    mockCacheSet.mockResolvedValue(true);
    mockCacheGet.mockResolvedValue(null);
    mockCacheDel.mockResolvedValue(true);

    // Prime
    await loadPermissions();
    expect(mockFindAll).toHaveBeenCalledTimes(1);

    // Invalidate
    await invalidatePermissionCache();

    // Next call should hit DB again
    await getPermissions();
    expect(mockFindAll).toHaveBeenCalledTimes(2);
  });

  it("should force next getFieldPermissions call to reload from DB", async () => {
    mockFieldFindAll.mockResolvedValue(sampleFieldRows);
    mockCacheSet.mockResolvedValue(true);
    mockCacheGet.mockResolvedValue(null);
    mockCacheDel.mockResolvedValue(true);

    // Prime
    await loadFieldPermissions();
    expect(mockFieldFindAll).toHaveBeenCalledTimes(1);

    // Invalidate
    await invalidatePermissionCache();

    // Next call should hit DB again
    await getFieldPermissions();
    expect(mockFieldFindAll).toHaveBeenCalledTimes(2);
  });
});

// ══════════════════════════════════════════════
// Field-Level Permissions
// ══════════════════════════════════════════════

describe("loadFieldPermissions", () => {
  it("should fetch hidden=true rows and build a FieldPermissionMap", async () => {
    mockFieldFindAll.mockResolvedValue(sampleFieldRows);
    mockCacheSet.mockResolvedValue(true);

    const result = await loadFieldPermissions();

    expect(mockFieldFindAll).toHaveBeenCalledWith({
      where: { hidden: true },
      raw: true,
    });
    expect(result).toEqual({
      Scout: {
        players: ["salary", "passport_number"],
        contracts: ["value"],
      },
      Agent: {
        finance: ["commission"],
      },
    });
  });

  it("should store the result in Redis with HOUR TTL", async () => {
    mockFieldFindAll.mockResolvedValue(sampleFieldRows);
    mockCacheSet.mockResolvedValue(true);

    await loadFieldPermissions();

    expect(mockCacheSet).toHaveBeenCalledWith(
      "rbac:field-permissions",
      expect.any(Object),
      3600,
    );
  });

  it("should return empty map when no hidden fields exist", async () => {
    mockFieldFindAll.mockResolvedValue([]);
    mockCacheSet.mockResolvedValue(true);

    const result = await loadFieldPermissions();

    expect(result).toEqual({});
  });
});

describe("getFieldPermissions", () => {
  it("should return from memory cache on second call (cache hit)", async () => {
    mockFieldFindAll.mockResolvedValue(sampleFieldRows);
    mockCacheSet.mockResolvedValue(true);

    const first = await getFieldPermissions();
    expect(mockFieldFindAll).toHaveBeenCalledTimes(1);

    const second = await getFieldPermissions();
    expect(mockFieldFindAll).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it("should fall back to Redis when memory cache is empty", async () => {
    const cachedMap = {
      Scout: { players: ["salary"] },
    };
    mockCacheGet.mockResolvedValue(cachedMap);

    const result = await getFieldPermissions();

    expect(mockCacheGet).toHaveBeenCalledWith("rbac:field-permissions");
    expect(result).toEqual(cachedMap);
    expect(mockFieldFindAll).not.toHaveBeenCalled();
  });

  it("should fall back to DB when both memory and Redis miss", async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFieldFindAll.mockResolvedValue(sampleFieldRows);
    mockCacheSet.mockResolvedValue(true);

    const result = await getFieldPermissions();

    expect(mockCacheGet).toHaveBeenCalledWith("rbac:field-permissions");
    expect(mockFieldFindAll).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("Scout");
    expect(result).toHaveProperty("Agent");
  });
});

describe("getHiddenFields", () => {
  beforeEach(async () => {
    mockFieldFindAll.mockResolvedValue(sampleFieldRows);
    mockCacheSet.mockResolvedValue(true);
    mockCacheGet.mockResolvedValue(null);
    // Prime the field cache
    await loadFieldPermissions();
  });

  it("should always return empty array for Admin role", async () => {
    const result = await getHiddenFields("Admin", "players");
    expect(result).toEqual([]);
  });

  it("should return hidden fields for a matching role + module", async () => {
    const result = await getHiddenFields("Scout", "players");
    expect(result).toEqual(["salary", "passport_number"]);
  });

  it("should return single hidden field when only one is hidden", async () => {
    const result = await getHiddenFields("Scout", "contracts");
    expect(result).toEqual(["value"]);
  });

  it("should return empty array for a role with no hidden fields on that module", async () => {
    const result = await getHiddenFields("Agent", "players");
    expect(result).toEqual([]);
  });

  it("should return empty array for unknown role", async () => {
    const result = await getHiddenFields("UnknownRole", "players");
    expect(result).toEqual([]);
  });

  it("should return empty array for unknown module", async () => {
    const result = await getHiddenFields("Scout", "nonexistent");
    expect(result).toEqual([]);
  });
});
