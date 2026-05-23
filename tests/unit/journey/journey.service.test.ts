// ── Mock models ──

jest.mock("../../../src/modules/journey/journey.model", () => ({
  Journey: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    max: jest.fn(),
  },
}));

jest.mock(
  "../../../src/modules/evolution-cycles/evolution-cycle.model",
  () => ({
    EvolutionCycle: {},
  }),
);

jest.mock("../../../src/modules/tickets/ticket.model", () => ({
  Ticket: {
    findAll: jest.fn(),
  },
}));

jest.mock("../../../src/modules/referrals/referral.model", () => ({
  Referral: {},
}));

jest.mock("../../../src/modules/gates/gate.model", () => ({
  Gate: {},
}));

jest.mock("@config/database", () => ({
  sequelize: {
    fn: jest.fn(),
    col: jest.fn(),
    literal: jest.fn(),
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { Journey } from "../../../src/modules/journey/journey.model";
import { Ticket } from "../../../src/modules/tickets/ticket.model";
import {
  listJourneys,
  getJourneyById,
  createJourney,
  updateJourney,
  deleteJourney,
  getPlayerJourney,
  reorderStages,
} from "../../../src/modules/journey/journey.service";

// ── Helpers ──

const defaultQuery = {
  page: 1,
  limit: 20,
  sort: "created_at" as const,
  order: "desc" as const,
};

function freshStage(overrides: Record<string, unknown> = {}) {
  return {
    id: "stage-1",
    playerId: "player-1",
    title: "Stage 1",
    status: "NotStarted",
    stageOrder: 1,
    ticketStats: undefined as unknown,
    toJSON: jest.fn().mockReturnThis(),
    update: jest.fn().mockImplementation(function (this: Record<string, unknown>, data: Record<string, unknown>) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("JourneyService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Ticket.findAll as jest.Mock).mockResolvedValue([]);
    (Journey.update as jest.Mock).mockResolvedValue([0]);
    (Journey.max as jest.Mock).mockResolvedValue(0);
  });

  // ── listJourneys ──

  describe("listJourneys", () => {
    it("returns paginated stages with meta", async () => {
      const stages = [freshStage()];
      (Journey.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: stages,
        count: 1,
      });

      const result = await listJourneys(defaultQuery);

      expect(Journey.findAndCountAll).toHaveBeenCalled();
      expect(result.data).toEqual(stages);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it("applies playerId filter", async () => {
      (Journey.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listJourneys({ ...defaultQuery, playerId: "player-1" });

      const call = (Journey.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.playerId).toBe("player-1");
    });

    it("applies status filter", async () => {
      (Journey.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listJourneys({ ...defaultQuery, status: "InProgress" });

      const call = (Journey.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.status).toBe("InProgress");
    });

    it("attaches ticket stats for stages", async () => {
      const stage = freshStage();
      (Journey.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [stage],
        count: 1,
      });
      (Ticket.findAll as jest.Mock).mockResolvedValue([
        { journeyStageId: "stage-1", total: "3", completed: "1" },
      ]);

      await listJourneys(defaultQuery);

      expect(Ticket.findAll).toHaveBeenCalled();
    });
  });

  // ── getJourneyById ──

  describe("getJourneyById", () => {
    it("returns stage with tickets when found", async () => {
      const stage = freshStage();
      (Journey.findByPk as jest.Mock).mockResolvedValue(stage);

      const result = await getJourneyById("stage-1");

      expect(Journey.findByPk).toHaveBeenCalledWith(
        "stage-1",
        expect.any(Object),
      );
      expect(result).toHaveProperty("tickets");
    });

    it("throws 404 when not found", async () => {
      (Journey.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(getJourneyById("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Journey stage not found",
      });
    });
  });

  // ── createJourney ──

  describe("createJourney", () => {
    it("creates stage with provided stageOrder", async () => {
      const input = {
        playerId: "player-1",
        stageName: "New Stage",
        stageOwner: "Manager" as const,
        stageType: "General" as const,
        stageOrder: 3,
        status: "NotStarted" as const,
        health: "OnTrack" as const,
      };
      const created = freshStage({ ...input });
      (Journey.create as jest.Mock).mockResolvedValue(created);

      const result = await createJourney(input, "user-1");

      expect(Journey.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...input, createdBy: "user-1" }),
      );
      expect(result).toEqual(created);
    });

    it("auto-calculates stageOrder when not provided", async () => {
      const input = {
        playerId: "player-1",
        stageName: "New Stage",
        stageOwner: "Manager" as const,
        stageType: "General" as const,
        stageOrder: 0,
        status: "NotStarted" as const,
        health: "OnTrack" as const,
      };
      (Journey.max as jest.Mock).mockResolvedValue(5);
      const created = freshStage({ ...input, stageOrder: 6 });
      (Journey.create as jest.Mock).mockResolvedValue(created);

      await createJourney(input, "user-1");

      const createCall = (Journey.create as jest.Mock).mock.calls[0][0];
      expect(createCall.stageOrder).toBe(6);
    });
  });

  // ── updateJourney ──

  describe("updateJourney", () => {
    it("updates and returns stage", async () => {
      const stage = freshStage({ status: "NotStarted" });
      (Journey.findByPk as jest.Mock).mockResolvedValue(stage);

      await updateJourney("stage-1", { status: "InProgress" });

      expect(stage.update).toHaveBeenCalled();
    });

    it("auto-sets startDate when transitioning to InProgress", async () => {
      const stage = freshStage({ status: "NotStarted" });
      (Journey.findByPk as jest.Mock).mockResolvedValue(stage);

      await updateJourney("stage-1", { status: "InProgress" });

      const updateCall = (stage.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.startDate).toBeDefined();
    });

    it("auto-sets actualEndDate when transitioning to Completed", async () => {
      const stage = freshStage({ status: "InProgress" });
      (Journey.findByPk as jest.Mock).mockResolvedValue(stage);

      await updateJourney("stage-1", { status: "Completed" });

      const updateCall = (stage.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.actualEndDate).toBeDefined();
    });

    it("throws 404 when stage not found", async () => {
      (Journey.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        updateJourney("missing", { status: "InProgress" }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── deleteJourney ──

  describe("deleteJourney", () => {
    it("destroys and returns stage", async () => {
      const stage = freshStage();
      (Journey.findByPk as jest.Mock).mockResolvedValue(stage);

      const result = await deleteJourney("stage-1");

      expect(stage.destroy).toHaveBeenCalled();
      expect(result).toEqual(stage);
    });

    it("throws 404 when stage not found", async () => {
      (Journey.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(deleteJourney("missing")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── getPlayerJourney ──

  describe("getPlayerJourney", () => {
    it("returns all stages for a player", async () => {
      const stages = [freshStage()];
      (Journey.findAll as jest.Mock).mockResolvedValue(stages);

      const result = await getPlayerJourney("player-1");

      expect(Journey.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { playerId: "player-1" } }),
      );
      expect(result).toEqual(stages);
    });
  });

  // ── reorderStages ──

  describe("reorderStages", () => {
    it("updates stageOrder for each stage in transaction", async () => {
      const stages = [freshStage(), freshStage({ id: "stage-2", stageOrder: 2 })];
      const mockTx = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      const { sequelize } = require("@config/database");
      (sequelize.transaction as jest.Mock).mockResolvedValue(mockTx);
      (Journey.update as jest.Mock).mockResolvedValue([1]);
      (Journey.findAll as jest.Mock).mockResolvedValue(stages);

      const result = await reorderStages({
        playerId: "player-1",
        stageIds: ["stage-1", "stage-2"],
      });

      expect(Journey.update).toHaveBeenCalledTimes(2);
      expect(mockTx.commit).toHaveBeenCalled();
      expect(result).toEqual(stages);
    });
  });
});
