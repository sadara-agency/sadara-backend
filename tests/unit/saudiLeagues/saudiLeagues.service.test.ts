// ── Mock models ──

jest.mock("../../../src/modules/competitions/competition.model", () => ({
  Competition: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  ClubCompetition: {},
}));

import { Competition } from "../../../src/modules/competitions/competition.model";
import {
  listSaudiLeagues,
  getSaudiLeaguesGrouped,
  getSaudiLeagueById,
} from "../../../src/modules/saudiLeagues/saudiLeagues.service";

// ── Helpers ──

function makeComp(overrides: Record<string, unknown> = {}) {
  return {
    id: "comp-1",
    name: "Saudi Pro League",
    country: "Saudi Arabia",
    type: "league",
    tier: 1,
    ageGroup: null,
    agencyValue: "Critical",
    isActive: true,
    ...overrides,
  };
}

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("SaudiLeaguesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listSaudiLeagues ──

  describe("listSaudiLeagues", () => {
    it("returns active Saudi competitions", async () => {
      const competitions = [makeComp()];
      (Competition.findAll as jest.Mock).mockResolvedValue(competitions);

      const result = await listSaudiLeagues();

      expect(Competition.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { country: "Saudi Arabia", isActive: true },
        }),
      );
      expect(result).toEqual(competitions);
    });

    it("returns empty array when no competitions", async () => {
      (Competition.findAll as jest.Mock).mockResolvedValue([]);

      const result = await listSaudiLeagues();

      expect(result).toEqual([]);
    });
  });

  // ── getSaudiLeaguesGrouped ──

  describe("getSaudiLeaguesGrouped", () => {
    it("groups competitions into categories", async () => {
      const competitions = [
        makeComp({
          id: "comp-1",
          type: "league",
          ageGroup: null,
          agencyValue: "Critical",
        }),
        makeComp({
          id: "comp-2",
          type: "cup",
          ageGroup: null,
          agencyValue: "High",
        }),
        makeComp({
          id: "comp-3",
          type: "league",
          ageGroup: "U21",
          agencyValue: "Medium",
        }),
      ];
      (Competition.findAll as jest.Mock).mockResolvedValue(competitions);

      const result = await getSaudiLeaguesGrouped();

      const categories = result.map((g) => g.category);
      expect(categories).toContain("senior_professional");
      expect(categories).toContain("senior_cups");
      expect(categories).toContain("elite_youth");
    });

    it("filters out empty groups", async () => {
      // Only senior_professional comps present
      const competitions = [
        makeComp({
          type: "league",
          ageGroup: null,
          agencyValue: "Critical",
        }),
      ];
      (Competition.findAll as jest.Mock).mockResolvedValue(competitions);

      const result = await getSaudiLeaguesGrouped();

      // Only groups with at least 1 competition are returned
      expect(result.length).toBeGreaterThan(0);
      result.forEach((g) => expect(g.competitions.length).toBeGreaterThan(0));
    });

    it("returns empty array when no competitions found", async () => {
      (Competition.findAll as jest.Mock).mockResolvedValue([]);

      const result = await getSaudiLeaguesGrouped();

      expect(result).toEqual([]);
    });

    it("places U21 competitions in elite_youth group", async () => {
      const competitions = [
        makeComp({ id: "youth-1", type: "league", ageGroup: "U21", agencyValue: "Medium" }),
      ];
      (Competition.findAll as jest.Mock).mockResolvedValue(competitions);

      const result = await getSaudiLeaguesGrouped();

      const eliteYouth = result.find((g) => g.category === "elite_youth");
      expect(eliteYouth).toBeDefined();
      expect(eliteYouth!.competitions).toHaveLength(1);
    });

    it("includes labelAr for each group", async () => {
      const competitions = [makeComp({ type: "cup", ageGroup: null })];
      (Competition.findAll as jest.Mock).mockResolvedValue(competitions);

      const result = await getSaudiLeaguesGrouped();

      result.forEach((g) => {
        expect(g.labelAr).toBeDefined();
        expect(typeof g.labelAr).toBe("string");
      });
    });
  });

  // ── getSaudiLeagueById ──

  describe("getSaudiLeagueById", () => {
    it("returns competition when found", async () => {
      const comp = makeComp();
      (Competition.findOne as jest.Mock).mockResolvedValue(comp);

      const result = await getSaudiLeagueById("comp-1");

      expect(Competition.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comp-1", country: "Saudi Arabia" },
        }),
      );
      expect(result).toEqual(comp);
    });

    it("throws 404 when competition not found", async () => {
      (Competition.findOne as jest.Mock).mockResolvedValue(null);

      await expect(getSaudiLeagueById("missing")).rejects.toMatchObject({
        statusCode: 404,
        message: "Saudi league not found",
      });
    });
  });
});
