// ── Mock provider (HTTP layer) ──

jest.mock("../../../src/modules/sportmonks/sportmonks.provider", () => ({
  fetchFixtures: jest.fn(),
  fetchLeagues: jest.fn(),
  searchTeams: jest.fn(),
  testConnection: jest.fn(),
}));

// ── Mock models ──

jest.mock("../../../src/modules/matches/match.model", () => ({
  Match: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../../src/modules/clubs/club.model", () => ({
  Club: {
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("../../../src/modules/competitions/competition.model", () => ({
  Competition: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
  },
  ClubCompetition: {
    findOrCreate: jest.fn(),
  },
}));

jest.mock("@config/database", () => ({
  sequelize: {
    query: jest.fn().mockResolvedValue([[], {}]),
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import * as provider from "../../../src/modules/sportmonks/sportmonks.provider";
import { Match } from "../../../src/modules/matches/match.model";
import { Club } from "../../../src/modules/clubs/club.model";
import {
  Competition,
  ClubCompetition,
} from "../../../src/modules/competitions/competition.model";
import {
  fetchFixtures,
  fetchLeagues,
  searchTeams,
  testConnection,
  getTeamMappings,
  mapTeam,
  unmapTeam,
  syncLeagues,
} from "../../../src/modules/sportmonks/sportmonks.service";

// ── Helpers ──

const smFixture = {
  id: 12345,
  state_id: 5,
  starting_at: "2025-10-15T20:00:00+00:00",
  participants: [
    {
      id: 100,
      name: "Al-Hilal",
      short_code: "HIL",
      image_path: "https://cdn.sportmonks.com/hil.png",
      meta: { location: "home" },
    },
    {
      id: 200,
      name: "Al-Nassr",
      short_code: "NAS",
      image_path: "https://cdn.sportmonks.com/nas.png",
      meta: { location: "away" },
    },
  ],
  scores: [
    { description: "CURRENT", participant_id: 100, score: { goals: 2 } },
    { description: "CURRENT", participant_id: 200, score: { goals: 1 } },
  ],
  league: { name: "Saudi Pro League", id: 999 },
  season: { name: "2025-26" },
  venue: { name: "Prince Faisal Stadium", city_name: "Riyadh" },
};

const smLeague = {
  id: 999,
  name: "Saudi Pro League",
  active: true,
};

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("SportmonksService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Club.findAll as jest.Mock).mockResolvedValue([]);
    (Club.update as jest.Mock).mockResolvedValue([1]);
    (Match.findAll as jest.Mock).mockResolvedValue([]);
    (Match.findOne as jest.Mock).mockResolvedValue(null);
    (Competition.findOne as jest.Mock).mockResolvedValue(null);
    (Competition.findOrCreate as jest.Mock).mockResolvedValue([{}, true]);
    (ClubCompetition.findOrCreate as jest.Mock).mockResolvedValue([{}, false]);
  });

  // ── fetchFixtures ──

  describe("fetchFixtures", () => {
    it("fetches and normalizes fixtures", async () => {
      (provider.fetchFixtures as jest.Mock).mockResolvedValue([smFixture]);

      const result = await fetchFixtures("2025-10-01", "2025-10-31");

      expect(provider.fetchFixtures).toHaveBeenCalledWith(
        "2025-10-01",
        "2025-10-31",
        undefined,
      );
      expect(result).toHaveLength(1);
      expect(result[0].homeTeam).toBe("Al-Hilal");
      expect(result[0].awayTeam).toBe("Al-Nassr");
      expect(result[0].homeScore).toBe(2);
      expect(result[0].awayScore).toBe(1);
    });

    it("marks fixture as imported when already in DB", async () => {
      (provider.fetchFixtures as jest.Mock).mockResolvedValue([smFixture]);
      (Match.findAll as jest.Mock).mockResolvedValue([
        { externalMatchId: "12345" },
      ]);

      const result = await fetchFixtures("2025-10-01", "2025-10-31");

      expect(result[0].isImported).toBe(true);
    });

    it("passes leagueId to provider when provided", async () => {
      (provider.fetchFixtures as jest.Mock).mockResolvedValue([]);

      await fetchFixtures("2025-10-01", "2025-10-31", 999);

      expect(provider.fetchFixtures).toHaveBeenCalledWith(
        "2025-10-01",
        "2025-10-31",
        999,
      );
    });
  });

  // ── fetchLeagues ──

  describe("fetchLeagues", () => {
    it("delegates to provider", async () => {
      (provider.fetchLeagues as jest.Mock).mockResolvedValue([smLeague]);

      const result = await fetchLeagues();

      expect(provider.fetchLeagues).toHaveBeenCalled();
      expect(result).toEqual([smLeague]);
    });
  });

  // ── searchTeams ──

  describe("searchTeams", () => {
    it("delegates to provider with query", async () => {
      const teams = [{ id: 100, name: "Al-Hilal" }];
      (provider.searchTeams as jest.Mock).mockResolvedValue(teams);

      const result = await searchTeams("Hilal");

      expect(provider.searchTeams).toHaveBeenCalledWith("Hilal");
      expect(result).toEqual(teams);
    });
  });

  // ── testConnection ──

  describe("testConnection", () => {
    it("returns true when provider succeeds", async () => {
      (provider.testConnection as jest.Mock).mockResolvedValue(true);

      const result = await testConnection();

      expect(result).toBe(true);
    });

    it("returns false when provider returns false", async () => {
      (provider.testConnection as jest.Mock).mockResolvedValue(false);

      const result = await testConnection();

      expect(result).toBe(false);
    });
  });

  // ── getTeamMappings ──

  describe("getTeamMappings", () => {
    it("returns mapped clubs", async () => {
      const clubs = [
        {
          id: "club-1",
          name: "Al-Hilal",
          nameAr: "الهلال",
          logoUrl: null,
          sportmonksTeamId: 100,
        },
      ];
      (Club.findAll as jest.Mock).mockResolvedValue(clubs);

      const result = await getTeamMappings();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        clubId: "club-1",
        clubName: "Al-Hilal",
        clubNameAr: "الهلال",
        clubLogo: null,
        sportmonksTeamId: 100,
      });
    });

    it("returns empty array when no clubs mapped", async () => {
      (Club.findAll as jest.Mock).mockResolvedValue([]);

      const result = await getTeamMappings();

      expect(result).toEqual([]);
    });
  });

  // ── mapTeam ──

  describe("mapTeam", () => {
    it("clears existing mapping then sets new mapping", async () => {
      await mapTeam(100, "club-1");

      expect(Club.update).toHaveBeenCalledTimes(2);
      const clearCall = (Club.update as jest.Mock).mock.calls[0];
      const setCall = (Club.update as jest.Mock).mock.calls[1];
      expect(clearCall[0]).toEqual({ sportmonksTeamId: null });
      expect(clearCall[1]).toEqual({ where: { sportmonksTeamId: 100 } });
      expect(setCall[0]).toEqual({ sportmonksTeamId: 100 });
      expect(setCall[1]).toEqual({ where: { id: "club-1" } });
    });
  });

  // ── unmapTeam ──

  describe("unmapTeam", () => {
    it("clears sportmonksTeamId for club", async () => {
      await unmapTeam("club-1");

      expect(Club.update).toHaveBeenCalledWith(
        { sportmonksTeamId: null },
        { where: { id: "club-1" } },
      );
    });
  });

  // ── syncLeagues ──

  describe("syncLeagues", () => {
    it("creates new competitions and returns count", async () => {
      (provider.fetchLeagues as jest.Mock).mockResolvedValue([smLeague]);
      (Competition.findOrCreate as jest.Mock).mockResolvedValue([{}, true]);

      const count = await syncLeagues();

      expect(count).toBe(1);
      expect(Competition.findOrCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sportmonksLeagueId: 999 },
          defaults: expect.objectContaining({ name: "Saudi Pro League" }),
        }),
      );
    });

    it("skips already existing competitions", async () => {
      (provider.fetchLeagues as jest.Mock).mockResolvedValue([smLeague]);
      (Competition.findOrCreate as jest.Mock).mockResolvedValue([{}, false]);

      const count = await syncLeagues();

      expect(count).toBe(0);
    });
  });
});
