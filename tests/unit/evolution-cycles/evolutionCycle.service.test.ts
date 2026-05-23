// ── Mock models ──

jest.mock(
  "../../../src/modules/evolution-cycles/evolution-cycle.model",
  () => ({
    EvolutionCycle: {
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
    },
  }),
);

jest.mock("../../../src/modules/journey/journey.model", () => ({
  Journey: {
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));

import { EvolutionCycle } from "../../../src/modules/evolution-cycles/evolution-cycle.model";
import { Journey } from "../../../src/modules/journey/journey.model";
import {
  listEvolutionCycles,
  getEvolutionCycleById,
  createEvolutionCycle,
  updateEvolutionCycle,
  advancePhase,
  deleteEvolutionCycle,
  getPlayerEvolutionCycles,
} from "../../../src/modules/evolution-cycles/evolution-cycle.service";

// ── Helpers ──

const defaultQuery = {
  page: 1,
  limit: 20,
  sort: "created_at" as const,
  order: "desc" as const,
};

function freshCycle(overrides: Record<string, unknown> = {}) {
  const base = {
    id: "ec-1",
    playerId: "player-1",
    name: "Cycle 1",
    status: "Active",
    tier: "DevelopingPerformer",
    currentPhase: "Foundation" as const,
    phaseStats: undefined as unknown,
    toJSON: jest.fn().mockReturnThis(),
    update: jest.fn().mockImplementation(function (this: Record<string, unknown>, data: Record<string, unknown>) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  base.toJSON = jest.fn().mockReturnValue(base);
  return base;
}

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("EvolutionCycleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Journey.findAll as jest.Mock).mockResolvedValue([]);
    (Journey.update as jest.Mock).mockResolvedValue([0]);
  });

  // ── listEvolutionCycles ──

  describe("listEvolutionCycles", () => {
    it("returns paginated cycles with meta", async () => {
      const cycles = [freshCycle()];
      (EvolutionCycle.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: cycles,
        count: 1,
      });

      const result = await listEvolutionCycles(defaultQuery);

      expect(EvolutionCycle.findAndCountAll).toHaveBeenCalled();
      expect(result.data).toEqual(cycles);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it("applies playerId filter", async () => {
      (EvolutionCycle.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listEvolutionCycles({ ...defaultQuery, playerId: "player-1" });

      const call = (EvolutionCycle.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.playerId).toBe("player-1");
    });

    it("applies status filter", async () => {
      (EvolutionCycle.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listEvolutionCycles({ ...defaultQuery, status: "Active" });

      const call = (EvolutionCycle.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.status).toBe("Active");
    });

    it("attaches phaseStats from journey stages", async () => {
      const cycle = freshCycle();
      (EvolutionCycle.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [cycle],
        count: 1,
      });
      (Journey.findAll as jest.Mock).mockResolvedValue([
        { evolutionCycleId: "ec-1", phase: "Foundation", status: "Completed" },
      ]);

      const result = await listEvolutionCycles(defaultQuery);

      expect(result.data[0].phaseStats).toBeDefined();
      expect((result.data[0].phaseStats as Record<string, unknown>).Foundation).toBeDefined();
    });
  });

  // ── getEvolutionCycleById ──

  describe("getEvolutionCycleById", () => {
    it("returns cycle with stages when found", async () => {
      const cycle = freshCycle();
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(cycle);

      const result = await getEvolutionCycleById("ec-1");

      expect(EvolutionCycle.findByPk).toHaveBeenCalledWith("ec-1");
      expect(result).toHaveProperty("stages");
      expect(result).toHaveProperty("phaseStats");
    });

    it("throws 404 when not found", async () => {
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(getEvolutionCycleById("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Evolution cycle not found",
      });
    });
  });

  // ── createEvolutionCycle ──

  describe("createEvolutionCycle", () => {
    it("creates and returns new cycle", async () => {
      const input = {
        playerId: "player-1",
        name: "New Cycle",
        currentPhase: "Diagnostic" as const,
        tier: "StrugglingTalent" as const,
        status: "Active" as const,
      };
      const created = freshCycle({ ...input });
      (EvolutionCycle.create as jest.Mock).mockResolvedValue(created);

      const result = await createEvolutionCycle(input, "user-1");

      expect(EvolutionCycle.create).toHaveBeenCalledWith({
        ...input,
        createdBy: "user-1",
      });
      expect(result).toEqual(created);
    });
  });

  // ── updateEvolutionCycle ──

  describe("updateEvolutionCycle", () => {
    it("updates and returns cycle", async () => {
      const cycle = freshCycle({ status: "Draft" });
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(cycle);

      await updateEvolutionCycle("ec-1", { status: "Active" });

      expect(cycle.update).toHaveBeenCalled();
    });

    it("auto-sets startDate when transitioning to Active", async () => {
      const cycle = freshCycle({ status: "Draft" });
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(cycle);

      await updateEvolutionCycle("ec-1", { status: "Active" });

      const updateCall = (cycle.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.startDate).toBeDefined();
    });

    it("auto-sets actualEndDate when transitioning to Completed", async () => {
      const cycle = freshCycle({ status: "Active" });
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(cycle);

      await updateEvolutionCycle("ec-1", { status: "Completed" });

      const updateCall = (cycle.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.actualEndDate).toBeDefined();
    });

    it("throws 404 when cycle not found", async () => {
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        updateEvolutionCycle("missing", { status: "Active" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── advancePhase ──

  describe("advancePhase", () => {
    it("advances phase and updates tier", async () => {
      const cycle = freshCycle({ currentPhase: "Foundation" });
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(cycle);

      await advancePhase("ec-1", { nextPhase: "Integration" });

      expect(cycle.update).toHaveBeenCalledWith(
        expect.objectContaining({ currentPhase: "Integration", tier: "MatchReadyPro" }),
      );
    });

    it("throws 400 when trying to move backwards", async () => {
      const cycle = freshCycle({ currentPhase: "Integration" });
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(cycle);

      await expect(
        advancePhase("ec-1", { nextPhase: "Foundation" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws 404 when cycle not found", async () => {
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        advancePhase("missing", { nextPhase: "Integration" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── deleteEvolutionCycle ──

  describe("deleteEvolutionCycle", () => {
    it("unlinks journey stages and destroys cycle", async () => {
      const cycle = freshCycle();
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(cycle);

      await deleteEvolutionCycle("ec-1");

      expect(Journey.update).toHaveBeenCalled();
      expect(cycle.destroy).toHaveBeenCalled();
    });

    it("throws 404 when cycle not found", async () => {
      (EvolutionCycle.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(deleteEvolutionCycle("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── getPlayerEvolutionCycles ──

  describe("getPlayerEvolutionCycles", () => {
    it("returns all cycles for a player", async () => {
      const cycles = [freshCycle()];
      (EvolutionCycle.findAll as jest.Mock).mockResolvedValue(cycles);

      const result = await getPlayerEvolutionCycles("player-1");

      expect(EvolutionCycle.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { playerId: "player-1" } }),
      );
      expect(result).toEqual(cycles);
    });
  });
});
