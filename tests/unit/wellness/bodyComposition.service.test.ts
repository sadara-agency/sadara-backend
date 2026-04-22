/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/wellness/bodyComposition.service.test.ts
// Unit tests for bodyComposition.service (Sequelize model mocked)
// ─────────────────────────────────────────────────────────────
import { mockModelInstance } from "../../setup/test-helpers";

// ── Mock Sequelize model ──
const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();

jest.mock("../../../src/modules/wellness/bodyComposition.model", () => ({
  __esModule: true,
  default: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

jest.mock("../../../src/config/database", () => ({
  sequelize: { query: jest.fn().mockResolvedValue([]) },
}));

jest.mock("../../../src/shared/utils/rowScope", () => ({
  buildRowScope: jest.fn().mockResolvedValue(null),
  checkRowAccess: jest.fn().mockResolvedValue(true),
  mergeScope: jest.fn(),
}));

jest.mock("../../../src/shared/utils/cache", () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: "wellness", DASHBOARD: "dashboard" },
}));

jest.mock("../../../src/config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock("../../../src/modules/wellness/nutritionPrescription.service", () => ({
  issueNewVersion: jest.fn().mockResolvedValue(null),
}));

import * as svc from "../../../src/modules/wellness/bodyComposition.service";
import * as rowScope from "../../../src/shared/utils/rowScope";

const SCAN_ID = "550e8400-e29b-41d4-a716-446655440001";
const PLAYER_ID = "550e8400-e29b-41d4-a716-446655440002";
const USER_ID = "550e8400-e29b-41d4-a716-446655440003";

const fakeScanData = {
  id: SCAN_ID,
  playerId: PLAYER_ID,
  scanDate: "2026-04-22",
  weightKg: 75.5,
  bodyFatPct: 12.3,
  recordedBy: USER_ID,
};

const fakeScan = () => mockModelInstance({ ...fakeScanData });

const adminUser = {
  id: USER_ID,
  email: "admin@sadara.com",
  fullName: "Admin",
  role: "Admin" as const,
};

describe("BodyComposition Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockResolvedValue(null);
    (rowScope.buildRowScope as jest.Mock).mockResolvedValue(null);
    (rowScope.checkRowAccess as jest.Mock).mockResolvedValue(true);
  });

  // ════════════════════════════════════════════════════════
  // listScans
  // ════════════════════════════════════════════════════════
  describe("listScans", () => {
    it("returns paginated scans with default query", async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [fakeScan()], count: 1 });

      const result = await svc.listScans({ page: 1, limit: 20 }, adminUser);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
    });

    it("applies date range filter when from/to provided", async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await svc.listScans(
        { page: 1, limit: 20, from: "2026-01-01", to: "2026-04-30" },
        adminUser,
      );

      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where).toHaveProperty("scanDate");
    });

    it("merges rowScope when user has restricted access", async () => {
      const scope = { playerId: PLAYER_ID };
      (rowScope.buildRowScope as jest.Mock).mockResolvedValue(scope);
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await svc.listScans({ page: 1, limit: 20 }, adminUser);

      expect(rowScope.mergeScope).toHaveBeenCalledWith(
        expect.anything(),
        scope,
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // listScansForPlayer
  // ════════════════════════════════════════════════════════
  describe("listScansForPlayer", () => {
    it("returns scans filtered by playerId", async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [fakeScan()], count: 1 });

      const result = await svc.listScansForPlayer(
        PLAYER_ID,
        { page: 1, limit: 20 },
        adminUser,
      );

      expect(result.data).toHaveLength(1);
      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where.playerId).toBe(PLAYER_ID);
    });
  });

  // ════════════════════════════════════════════════════════
  // getScanById
  // ════════════════════════════════════════════════════════
  describe("getScanById", () => {
    it("returns the scan when found and access allowed", async () => {
      mockFindByPk.mockResolvedValue(fakeScan());

      const result = await svc.getScanById(SCAN_ID, adminUser);

      expect(result).toBeDefined();
      expect(mockFindByPk).toHaveBeenCalledWith(SCAN_ID);
    });

    it("throws 404 when scan does not exist", async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(svc.getScanById(SCAN_ID, adminUser)).rejects.toMatchObject({
        statusCode: 404,
        message: "Scan not found",
      });
    });

    it("throws 404 when checkRowAccess denies access", async () => {
      mockFindByPk.mockResolvedValue(fakeScan());
      (rowScope.checkRowAccess as jest.Mock).mockResolvedValue(false);

      await expect(svc.getScanById(SCAN_ID, adminUser)).rejects.toMatchObject({
        statusCode: 404,
        message: "Scan not found",
      });
    });
  });

  // ════════════════════════════════════════════════════════
  // createScan
  // ════════════════════════════════════════════════════════
  describe("createScan", () => {
    const createPayload = {
      playerId: PLAYER_ID,
      scanDate: "2026-04-22",
      weightKg: 75.5,
    };

    it("creates a scan and returns it", async () => {
      const created = fakeScan();
      mockCreate.mockResolvedValue(created);

      const result = await svc.createScan(createPayload, USER_ID);

      expect(result).toBe(created);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ recordedBy: USER_ID }),
      );
    });

    it("throws 409 when scan already exists for that date", async () => {
      mockFindOne.mockResolvedValue(fakeScan());

      await expect(
        svc.createScan(createPayload, USER_ID),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Scan already exists for this date",
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // updateScan
  // ════════════════════════════════════════════════════════
  describe("updateScan", () => {
    it("updates and returns the scan", async () => {
      const instance = fakeScan();
      mockFindByPk.mockResolvedValue(instance);

      const result = await svc.updateScan(SCAN_ID, { weightKg: 76.0 });

      expect(instance.update).toHaveBeenCalledWith({ weightKg: 76.0 });
      expect(result).toBeDefined();
    });

    it("throws 404 when scan does not exist", async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(
        svc.updateScan(SCAN_ID, { weightKg: 76.0 }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 409 when changing scanDate to a date that already has a scan", async () => {
      const instance = mockModelInstance({
        ...fakeScanData,
        scanDate: "2026-04-22",
      });
      mockFindByPk.mockResolvedValue(instance);
      mockFindOne.mockResolvedValue(fakeScan()); // conflict exists

      await expect(
        svc.updateScan(SCAN_ID, { scanDate: "2026-04-23" }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Scan already exists for this date",
      });
    });

    it("skips date-conflict check when scanDate is unchanged", async () => {
      const instance = fakeScan();
      mockFindByPk.mockResolvedValue(instance);

      await svc.updateScan(SCAN_ID, { scanDate: "2026-04-22" });

      // findOne for conflict check should NOT be called (same date)
      expect(mockFindOne).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════
  // deleteScan
  // ════════════════════════════════════════════════════════
  describe("deleteScan", () => {
    it("deletes the scan and returns { id }", async () => {
      mockFindByPk.mockResolvedValue(fakeScan());

      const result = await svc.deleteScan(SCAN_ID);

      expect(result).toEqual({ id: SCAN_ID });
    });

    it("throws 404 when scan does not exist", async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(svc.deleteScan(SCAN_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ════════════════════════════════════════════════════════
  // getLatestScan
  // ════════════════════════════════════════════════════════
  describe("getLatestScan", () => {
    it("returns the most recent scan for a player", async () => {
      mockFindOne.mockResolvedValue(fakeScan());

      const result = await svc.getLatestScan(PLAYER_ID, adminUser);

      expect(result).toBeDefined();
      expect(mockFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { playerId: PLAYER_ID } }),
      );
    });

    it("throws 404 when access is denied", async () => {
      (rowScope.checkRowAccess as jest.Mock).mockResolvedValue(false);

      await expect(
        svc.getLatestScan(PLAYER_ID, adminUser),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Scan not found",
      });
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it("throws 404 when no scans exist for the player", async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        svc.getLatestScan(PLAYER_ID, adminUser),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "No scans found for this player",
      });
    });
  });
});
