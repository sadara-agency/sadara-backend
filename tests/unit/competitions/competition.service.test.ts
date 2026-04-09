import { AppError } from "@middleware/errorHandler";

// ── Mock models ──

const mockCompetitionInstance = {
  id: "comp-1",
  name: "Saudi Pro League",
  nameAr: "دوري روشن",
  country: "Saudi Arabia",
  type: "league" as const,
  tier: 1,
  ageGroup: null,
  gender: "men" as const,
  format: "outdoor" as const,
  agencyValue: "Critical" as const,
  sportmonksLeagueId: null,
  saffId: null,
  isActive: true,
  update: jest.fn().mockImplementation(function (this: any, data: any) {
    Object.assign(this, data);
    return Promise.resolve(this);
  }),
  destroy: jest.fn().mockResolvedValue(undefined),
};

const mockClubCompetitionEntry = {
  id: "cc-1",
  clubId: "club-1",
  competitionId: "comp-1",
  season: "2025-26",
};

jest.mock("@modules/competitions/competition.model", () => ({
  Competition: {
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  },
  ClubCompetition: {
    findAll: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    findOrCreate: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("@modules/clubs/club.model", () => ({
  Club: {
    findByPk: jest.fn(),
    update: jest.fn().mockResolvedValue([1]),
  },
}));

// We mock serviceHelpers so findOrThrow / destroyById use the mocked model methods
jest.mock("@shared/utils/serviceHelpers", () => {
  const { AppError: AE } = jest.requireActual("@middleware/errorHandler");
  return {
    findOrThrow: jest.fn(async (model: any, id: string, label: string) => {
      const record = await model.findByPk(id);
      if (!record) throw new AE(`${label} not found`, 404);
      return record;
    }),
    destroyById: jest.fn(async (model: any, id: string, label: string) => {
      const record = await model.findByPk(id);
      if (!record) throw new AE(`${label} not found`, 404);
      await record.destroy();
      return { id };
    }),
  };
});

import {
  Competition,
  ClubCompetition,
} from "@modules/competitions/competition.model";
import { Club } from "@modules/clubs/club.model";
import {
  listCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  getCompetitionClubs,
  addClubToCompetition,
  removeClubFromCompetition,
  getClubCompetitions,
} from "@modules/competitions/competition.service";

// ── Helpers ──

function freshInstance(overrides: Record<string, any> = {}) {
  return {
    ...mockCompetitionInstance,
    update: jest.fn().mockImplementation(function (this: any, data: any) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const defaultQuery = {
  page: 1,
  limit: 50,
  sort: "tier" as const,
  order: "asc" as const,
  search: undefined,
  type: undefined,
  tier: undefined,
  ageGroup: undefined,
  gender: undefined,
  format: undefined,
  agencyValue: undefined,
  isActive: undefined,
};

// ═══════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════

describe("CompetitionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no existing league enrollment (for addClubToCompetition checks)
    (ClubCompetition.findOne as jest.Mock).mockResolvedValue(null);
    // Default: syncClubLeagueField needs Club.update
    (Club.update as jest.Mock).mockResolvedValue([1]);
  });

  // ── listCompetitions ──

  describe("listCompetitions", () => {
    it("returns paginated rows with meta", async () => {
      const rows = [freshInstance()];
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows,
        count: 1,
      });

      const result = await listCompetitions(defaultQuery);

      expect(Competition.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
          order: [["tier", "asc"]],
        }),
      );
      expect(result.data).toEqual(rows);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it("applies search filter with Op.or", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listCompetitions({ ...defaultQuery, search: "pro" });

      const call = (Competition.findAndCountAll as jest.Mock).mock.calls[0][0];
      const symbols = Object.getOwnPropertySymbols(call.where);
      expect(symbols.length).toBe(1); // Op.or
    });

    it("applies type filter", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listCompetitions({ ...defaultQuery, type: "cup" });

      const call = (Competition.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.type).toBe("cup");
    });

    it("applies tier filter", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listCompetitions({ ...defaultQuery, tier: 2 });

      const call = (Competition.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.tier).toBe(2);
    });

    it("applies gender filter", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listCompetitions({ ...defaultQuery, gender: "women" });

      const call = (Competition.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.gender).toBe("women");
    });

    it("applies format filter", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listCompetitions({ ...defaultQuery, format: "futsal" });

      const call = (Competition.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.format).toBe("futsal");
    });

    it("applies agencyValue filter", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listCompetitions({ ...defaultQuery, agencyValue: "High" });

      const call = (Competition.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.agencyValue).toBe("High");
    });

    it("applies isActive filter", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 0,
      });

      await listCompetitions({ ...defaultQuery, isActive: false });

      const call = (Competition.findAndCountAll as jest.Mock).mock.calls[0][0];
      expect(call.where.isActive).toBe(false);
    });

    it("calculates correct offset for page > 1", async () => {
      (Competition.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: [],
        count: 100,
      });

      const result = await listCompetitions({
        ...defaultQuery,
        page: 3,
        limit: 10,
      });

      expect(Competition.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 20, limit: 10 }),
      );
      expect(result.meta.totalPages).toBe(10);
    });
  });

  // ── getCompetitionById ──

  describe("getCompetitionById", () => {
    it("returns competition when found", async () => {
      const instance = freshInstance();
      (Competition.findByPk as jest.Mock).mockResolvedValue(instance);

      const result = await getCompetitionById("comp-1");

      expect(Competition.findByPk).toHaveBeenCalledWith("comp-1");
      expect(result).toEqual(instance);
    });

    it("throws 404 when not found", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(getCompetitionById("missing")).rejects.toThrow(AppError);
      await expect(getCompetitionById("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Competition not found",
      });
    });
  });

  // ── createCompetition ──

  describe("createCompetition", () => {
    it("calls Competition.create with input and returns result", async () => {
      const input = {
        name: "Kings Cup",
        country: "Saudi Arabia",
        type: "cup" as const,
        tier: 1,
        gender: "men" as const,
        format: "outdoor" as const,
        agencyValue: "High" as const,
      };
      const created = freshInstance({ ...input, id: "comp-2" });
      (Competition.create as jest.Mock).mockResolvedValue(created);

      const result = await createCompetition(input);

      expect(Competition.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });
  });

  // ── updateCompetition ──

  describe("updateCompetition", () => {
    it("finds competition, updates, and returns it", async () => {
      const instance = freshInstance();
      (Competition.findByPk as jest.Mock).mockResolvedValue(instance);

      const result = await updateCompetition("comp-1", { name: "Updated" });

      expect(Competition.findByPk).toHaveBeenCalledWith("comp-1");
      expect(instance.update).toHaveBeenCalledWith({ name: "Updated" });
      expect(result.name).toBe("Updated");
    });

    it("throws 404 when competition not found", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        updateCompetition("missing", { name: "X" }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Competition not found",
      });
    });
  });

  // ── deleteCompetition ──

  describe("deleteCompetition", () => {
    it("deletes and returns { id }", async () => {
      const instance = freshInstance();
      (Competition.findByPk as jest.Mock).mockResolvedValue(instance);

      const result = await deleteCompetition("comp-1");

      expect(instance.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: "comp-1" });
    });

    it("throws 404 when competition not found", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(deleteCompetition("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Competition not found",
      });
    });
  });

  // ── getCompetitionClubs ──

  describe("getCompetitionClubs", () => {
    it("returns club entries for a competition", async () => {
      const instance = freshInstance();
      (Competition.findByPk as jest.Mock).mockResolvedValue(instance);
      const entries = [mockClubCompetitionEntry];
      (ClubCompetition.findAll as jest.Mock).mockResolvedValue(entries);

      const result = await getCompetitionClubs("comp-1");

      expect(ClubCompetition.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { competitionId: "comp-1" },
          order: [["season", "DESC"]],
        }),
      );
      expect(result).toEqual(entries);
    });

    it("filters by season when provided", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(freshInstance());
      (ClubCompetition.findAll as jest.Mock).mockResolvedValue([]);

      await getCompetitionClubs("comp-1", "2025-26");

      const call = (ClubCompetition.findAll as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({
        competitionId: "comp-1",
        season: "2025-26",
      });
    });

    it("throws 404 when competition not found", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(getCompetitionClubs("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Competition not found",
      });
    });
  });

  // ── addClubToCompetition ──

  describe("addClubToCompetition", () => {
    it("creates club-competition entry when new", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(freshInstance());
      (Club.findByPk as jest.Mock).mockResolvedValue({ id: "club-1" });
      (ClubCompetition.findOrCreate as jest.Mock).mockResolvedValue([
        mockClubCompetitionEntry,
        true,
      ]);

      const result = await addClubToCompetition("comp-1", {
        clubId: "club-1",
        season: "2025-26",
      });

      expect(ClubCompetition.findOrCreate).toHaveBeenCalledWith({
        where: {
          clubId: "club-1",
          competitionId: "comp-1",
          season: "2025-26",
        },
        defaults: {
          clubId: "club-1",
          competitionId: "comp-1",
          season: "2025-26",
        },
      });
      expect(result).toEqual(mockClubCompetitionEntry);
    });

    it("throws 409 when club already exists in competition/season", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(freshInstance());
      (Club.findByPk as jest.Mock).mockResolvedValue({ id: "club-1" });
      (ClubCompetition.findOrCreate as jest.Mock).mockResolvedValue([
        mockClubCompetitionEntry,
        false,
      ]);

      await expect(
        addClubToCompetition("comp-1", {
          clubId: "club-1",
          season: "2025-26",
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Club already in this competition/season",
      });
    });

    it("throws 404 when competition not found", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        addClubToCompetition("missing", {
          clubId: "club-1",
          season: "2025-26",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Competition not found",
      });
    });

    it("throws 404 when club not found", async () => {
      (Competition.findByPk as jest.Mock).mockResolvedValue(freshInstance());
      (Club.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        addClubToCompetition("comp-1", {
          clubId: "missing-club",
          season: "2025-26",
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Club not found",
      });
    });
  });

  // ── removeClubFromCompetition ──

  describe("removeClubFromCompetition", () => {
    it("destroys and returns ids", async () => {
      (ClubCompetition.destroy as jest.Mock).mockResolvedValue(1);

      const result = await removeClubFromCompetition("comp-1", "club-1");

      expect(ClubCompetition.destroy).toHaveBeenCalledWith({
        where: { competitionId: "comp-1", clubId: "club-1" },
      });
      expect(result).toEqual({ competitionId: "comp-1", clubId: "club-1" });
    });

    it("includes season in where clause when provided", async () => {
      (ClubCompetition.destroy as jest.Mock).mockResolvedValue(1);

      await removeClubFromCompetition("comp-1", "club-1", "2025-26");

      const call = (ClubCompetition.destroy as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({
        competitionId: "comp-1",
        clubId: "club-1",
        season: "2025-26",
      });
    });

    it("throws 404 when no entry found", async () => {
      (ClubCompetition.destroy as jest.Mock).mockResolvedValue(0);

      await expect(
        removeClubFromCompetition("comp-1", "club-1"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Club-competition entry not found",
      });
    });
  });

  // ── getClubCompetitions ──

  describe("getClubCompetitions", () => {
    it("returns competitions for a club", async () => {
      const entries = [mockClubCompetitionEntry];
      (ClubCompetition.findAll as jest.Mock).mockResolvedValue(entries);

      const result = await getClubCompetitions("club-1");

      expect(ClubCompetition.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: "club-1" },
          order: [["season", "DESC"]],
        }),
      );
      expect(result).toEqual(entries);
    });

    it("filters by season when provided", async () => {
      (ClubCompetition.findAll as jest.Mock).mockResolvedValue([]);

      await getClubCompetitions("club-1", "2025-26");

      const call = (ClubCompetition.findAll as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({ clubId: "club-1", season: "2025-26" });
    });
  });
});
