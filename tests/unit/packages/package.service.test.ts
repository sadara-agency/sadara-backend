// ── Mock models ──

jest.mock("../../../src/modules/packages/package.model", () => ({
  Package: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("../../../src/modules/packages/packageConfig.model", () => ({
  PackageConfig: {
    findAll: jest.fn(),
    upsert: jest.fn(),
  },
}));

jest.mock("../../../src/modules/players/player.model", () => ({
  Player: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock("@config/database", () => ({
  sequelize: {
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock("@shared/utils/cache", () => ({
  cacheOrFetch: jest.fn((_key: string, fetchFn: () => Promise<unknown>) => fetchFn()),
  invalidateByPrefix: jest.fn().mockResolvedValue(0),
}));

jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("@shared/utils/packageAccess", () => ({
  PLAYER_PACKAGES: ["A+", "A", "B+", "B"],
}));

import { Package } from "../../../src/modules/packages/package.model";
import { PackageConfig } from "../../../src/modules/packages/packageConfig.model";
import { Player } from "../../../src/modules/players/player.model";
import {
  getPackageConfigs,
  updatePackageConfig,
  getPlayersByPackage,
  updatePlayerPackage,
  getAvailableModules,
  getPackageTiers,
  updatePackageTier,
} from "../../../src/modules/packages/package.service";

// ── Helpers ──

function freshPlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: "player-1",
    firstName: "Mohammed",
    lastName: "Al-Otaibi",
    playerPackage: "B",
    ...overrides,
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function freshTier(overrides: Record<string, unknown> = {}) {
  return {
    code: "B",
    name: "Basic",
    maxPlayers: null,
    isActive: true,
    displayOrder: 4,
    ...overrides,
    update: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn().mockReturnThis(),
  };
}

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("PackageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getPackageConfigs ──

  describe("getPackageConfigs", () => {
    it("returns configs grouped by package tier", async () => {
      const rows = [
        { package: "A", module: "players", canCreate: true, canRead: true, canUpdate: true, canDelete: false, toJSON: jest.fn().mockReturnThis() },
        { package: "B", module: "players", canCreate: false, canRead: true, canUpdate: false, canDelete: false, toJSON: jest.fn().mockReturnThis() },
      ];
      (PackageConfig.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await getPackageConfigs();

      expect(result).toHaveProperty("A");
      expect(result).toHaveProperty("B");
      expect(result.A).toHaveLength(1);
      expect(result.A[0].module).toBe("players");
    });

    it("returns empty arrays for tiers with no config", async () => {
      (PackageConfig.findAll as jest.Mock).mockResolvedValue([]);

      const result = await getPackageConfigs();

      expect(result["A+"]).toEqual([]);
      expect(result["A"]).toEqual([]);
    });
  });

  // ── updatePackageConfig ──

  describe("updatePackageConfig", () => {
    it("upserts each module config in a transaction", async () => {
      const mockTx = { commit: jest.fn().mockResolvedValue(undefined), rollback: jest.fn().mockResolvedValue(undefined) };
      const { sequelize } = require("@config/database");
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTx);
      (PackageConfig.upsert as jest.Mock).mockResolvedValue([{}, true]);

      await updatePackageConfig({
        package: "A",
        modules: [{ module: "players", canCreate: true, canRead: true, canUpdate: true, canDelete: false }],
      });

      expect(PackageConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ package: "A", module: "players" }),
        expect.any(Object),
      );
      expect(mockTx.commit).toHaveBeenCalled();
    });

    it("rolls back on error", async () => {
      const mockTx = { commit: jest.fn(), rollback: jest.fn().mockResolvedValue(undefined) };
      const { sequelize } = require("@config/database");
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTx);
      (PackageConfig.upsert as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        updatePackageConfig({
          package: "A",
          modules: [{ module: "players", canCreate: true, canRead: true, canUpdate: true, canDelete: false }],
        }),
      ).rejects.toThrow("DB error");

      expect(mockTx.rollback).toHaveBeenCalled();
    });
  });

  // ── getPlayersByPackage ──

  describe("getPlayersByPackage", () => {
    it("returns players grouped by package", async () => {
      const players = [
        freshPlayer({ playerPackage: "A" }),
        freshPlayer({ id: "player-2", playerPackage: "B" }),
      ];
      (Player.findAll as jest.Mock).mockResolvedValue(players);

      const result = await getPlayersByPackage();

      expect(result).toHaveProperty("A");
      expect(result).toHaveProperty("B");
      expect(result.A).toHaveLength(1);
      expect(result.B).toHaveLength(1);
    });
  });

  // ── updatePlayerPackage ──

  describe("updatePlayerPackage", () => {
    it("updates player package tier", async () => {
      const player = freshPlayer({ playerPackage: "B" });
      (Player.findByPk as jest.Mock).mockResolvedValue(player);
      (Package.findOne as jest.Mock).mockResolvedValue(null);

      await updatePlayerPackage("player-1", { playerPackage: "A" });

      expect(player.update).toHaveBeenCalledWith({ playerPackage: "A" });
    });

    it("skips cap check when package unchanged", async () => {
      const player = freshPlayer({ playerPackage: "A" });
      (Player.findByPk as jest.Mock).mockResolvedValue(player);

      await updatePlayerPackage("player-1", { playerPackage: "A" });

      expect(Package.findOne).not.toHaveBeenCalled();
      expect(player.update).toHaveBeenCalled();
    });

    it("throws 422 when tier cap is reached", async () => {
      const player = freshPlayer({ playerPackage: "B" });
      (Player.findByPk as jest.Mock).mockResolvedValue(player);
      (Package.findOne as jest.Mock).mockResolvedValue(freshTier({ code: "A+", maxPlayers: 2 }));
      (Player.count as jest.Mock).mockResolvedValue(2);

      await expect(
        updatePlayerPackage("player-1", { playerPackage: "A+" }),
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining("cap"),
      });
    });

    it("throws 404 when player not found", async () => {
      (Player.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        updatePlayerPackage("missing", { playerPackage: "A" }),
      ).rejects.toMatchObject({ statusCode: 404, message: "Player not found" });
    });
  });

  // ── getAvailableModules ──

  describe("getAvailableModules", () => {
    it("returns an array of module names", () => {
      const modules = getAvailableModules();
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules).toContain("players");
    });
  });

  // ── getPackageTiers ──

  describe("getPackageTiers", () => {
    it("returns active package tiers", async () => {
      const tiers = [freshTier()];
      (Package.findAll as jest.Mock).mockResolvedValue(tiers);

      const result = await getPackageTiers();

      expect(Package.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
      expect(result).toEqual(tiers);
    });
  });

  // ── updatePackageTier ──

  describe("updatePackageTier", () => {
    it("updates tier metadata", async () => {
      const tier = freshTier();
      (Package.findOne as jest.Mock).mockResolvedValue(tier);

      await updatePackageTier("B", { name: "Updated Basic" });

      expect(tier.update).toHaveBeenCalledWith({ name: "Updated Basic" });
    });

    it("throws 404 when tier not found", async () => {
      (Package.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        updatePackageTier("XX", { name: "Unknown" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining("XX"),
      });
    });
  });
});
