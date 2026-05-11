/// <reference types="jest" />

const mockConfigFindAll = jest.fn();
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
const mockCacheDel = jest.fn();

jest.mock("@config/database", () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock("@modules/permissions/permission.model", () => ({
  RolePermission: {
    findAll: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
  },
}));

jest.mock("@modules/permissions/fieldPermission.model", () => ({
  RoleFieldPermission: {
    findAll: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
  },
}));

jest.mock("@modules/permissions/configurableField.model", () => ({
  ConfigurableField: {
    findAll: (...a: unknown[]) => mockConfigFindAll(...a),
  },
}));

jest.mock("@shared/utils/cache", () => ({
  cacheGet: (...a: unknown[]) => mockCacheGet(...a),
  cacheSet: (...a: unknown[]) => mockCacheSet(...a),
  cacheDel: (...a: unknown[]) => mockCacheDel(...a),
  CacheTTL: { HOUR: 3600 },
}));

jest.mock("@shared/utils/verifyRole", () => ({
  verifyUserRole: jest.fn().mockResolvedValue(undefined),
}));

import {
  loadConfigurableFields,
  getConfigurableFields,
  invalidatePermissionCache,
} from "@modules/permissions/permission.service";
import { CONFIGURABLE_FIELDS } from "@modules/permissions/fieldPermission.config";

describe("permission.service — configurable fields", () => {
  beforeEach(async () => {
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockCacheDel.mockResolvedValue(undefined);
    // Reset the module-level in-memory cache so each test starts cold.
    await invalidatePermissionCache();
    jest.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
    mockCacheDel.mockResolvedValue(undefined);
  });

  it("loadConfigurableFields groups DB rows by module in sort order", async () => {
    mockConfigFindAll.mockResolvedValue([
      { module: "players", field: "phone", label: "Phone" },
      { module: "players", field: "email", label: "Email" },
      { module: "finance", field: "amount", label: "Amount" },
    ]);

    const map = await loadConfigurableFields();

    expect(map).toEqual({
      players: [
        { field: "phone", label: "Phone" },
        { field: "email", label: "Email" },
      ],
      finance: [{ field: "amount", label: "Amount" }],
    });
    expect(mockCacheSet).toHaveBeenCalledWith(
      "rbac:configurable-fields",
      map,
      3600,
    );
  });

  it("loadConfigurableFields falls back to the in-code constant when the table is empty", async () => {
    mockConfigFindAll.mockResolvedValue([]);

    const map = await loadConfigurableFields();

    const expected: Record<
      string,
      Array<{ field: string; label: string }>
    > = {};
    for (const [module, fields] of Object.entries(CONFIGURABLE_FIELDS)) {
      expected[module] = fields.map((f) => ({
        field: f.field,
        label: f.label,
      }));
    }
    expect(map).toEqual(expected);
  });

  it("getConfigurableFields returns the Redis-cached value without hitting the DB", async () => {
    mockCacheGet.mockResolvedValue({
      players: [{ field: "phone", label: "Phone" }],
    });

    const map = await getConfigurableFields();

    expect(map).toEqual({ players: [{ field: "phone", label: "Phone" }] });
    expect(mockConfigFindAll).not.toHaveBeenCalled();
  });

  it("getConfigurableFields loads from DB on a cache miss", async () => {
    mockCacheGet.mockResolvedValue(null);
    mockConfigFindAll.mockResolvedValue([
      { module: "offers", field: "agentFee", label: "Agent Fee" },
    ]);

    const map = await getConfigurableFields();

    expect(map).toEqual({
      offers: [{ field: "agentFee", label: "Agent Fee" }],
    });
    expect(mockConfigFindAll).toHaveBeenCalledTimes(1);
  });
});
