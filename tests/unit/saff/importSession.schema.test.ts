/// <reference types="jest" />

import {
  createSessionSchema,
  applySessionSchema,
  teamResolutionSchema,
  updateDecisionsSchema,
  scrapedStandingSchema,
  scrapedFixtureSchema,
  uploadPayloadSchema,
} from "../../../src/modules/saff/saff.validation";

describe("SAFF wizard schemas", () => {
  describe("createSessionSchema", () => {
    it("accepts a valid season + saffTournamentId", () => {
      const result = createSessionSchema.safeParse({
        saffTournamentId: 333,
        season: "2025-2026",
      });
      expect(result.success).toBe(true);
    });

    it("rejects season in wrong format", () => {
      const result = createSessionSchema.safeParse({
        saffTournamentId: 333,
        season: "2025/2026",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative saffTournamentId", () => {
      const result = createSessionSchema.safeParse({
        saffTournamentId: -1,
        season: "2025-2026",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("teamResolutionSchema (discriminated union)", () => {
    it("accepts 'map' with clubId", () => {
      const r = teamResolutionSchema.safeParse({
        saffTeamId: 100,
        action: "map",
        clubId: "11111111-2222-3333-4444-555555555555",
      });
      expect(r.success).toBe(true);
    });

    it("accepts 'create' with newClubData", () => {
      const r = teamResolutionSchema.safeParse({
        saffTeamId: 200,
        action: "create",
        newClubData: { name: "Al Test", nameAr: "تجربة" },
      });
      expect(r.success).toBe(true);
    });

    it("accepts 'skip'", () => {
      const r = teamResolutionSchema.safeParse({
        saffTeamId: 300,
        action: "skip",
      });
      expect(r.success).toBe(true);
    });

    it("rejects 'map' without clubId", () => {
      const r = teamResolutionSchema.safeParse({
        saffTeamId: 100,
        action: "map",
      });
      expect(r.success).toBe(false);
    });

    it("rejects 'create' without newClubData", () => {
      const r = teamResolutionSchema.safeParse({
        saffTeamId: 100,
        action: "create",
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown action", () => {
      const r = teamResolutionSchema.safeParse({
        saffTeamId: 100,
        action: "ignore",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("updateDecisionsSchema", () => {
    it("accepts an empty patch", () => {
      const r = updateDecisionsSchema.safeParse({});
      expect(r.success).toBe(true);
    });

    it("accepts a list of mixed resolutions", () => {
      const r = updateDecisionsSchema.safeParse({
        teamResolutions: [
          {
            saffTeamId: 1,
            action: "map",
            clubId: "11111111-2222-3333-4444-555555555555",
          },
          { saffTeamId: 2, action: "skip" },
          {
            saffTeamId: 3,
            action: "create",
            newClubData: { name: "X", nameAr: "س" },
          },
        ],
      });
      expect(r.success).toBe(true);
    });
  });

  describe("applySessionSchema", () => {
    it("requires a confirmDigest", () => {
      const r = applySessionSchema.safeParse({
        decisions: {},
      });
      expect(r.success).toBe(false);
    });

    it("accepts a valid payload", () => {
      const r = applySessionSchema.safeParse({
        decisions: { teamResolutions: [{ saffTeamId: 1, action: "skip" }] },
        confirmDigest: "abc123",
      });
      expect(r.success).toBe(true);
    });
  });

  describe("scrapedStandingSchema", () => {
    it("accepts a fully populated row", () => {
      const r = scrapedStandingSchema.safeParse({
        position: 1,
        saffTeamId: 100,
        teamNameEn: "Al Hilal",
        teamNameAr: "الهلال",
        played: 30,
        won: 22,
        drawn: 5,
        lost: 3,
        goalsFor: 65,
        goalsAgainst: 22,
        goalDifference: 43,
        points: 71,
      });
      expect(r.success).toBe(true);
    });

    it("rejects missing teamNameEn", () => {
      const r = scrapedStandingSchema.safeParse({
        position: 1,
        saffTeamId: 100,
        teamNameEn: "",
        teamNameAr: "",
        played: 30,
        won: 22,
        drawn: 5,
        lost: 3,
        goalsFor: 65,
        goalsAgainst: 22,
        goalDifference: 43,
        points: 71,
      });
      expect(r.success).toBe(false);
    });

    it("rejects implausibly large points", () => {
      const r = scrapedStandingSchema.safeParse({
        position: 1,
        saffTeamId: 100,
        teamNameEn: "Al Hilal",
        teamNameAr: "الهلال",
        played: 30,
        won: 22,
        drawn: 5,
        lost: 3,
        goalsFor: 65,
        goalsAgainst: 22,
        goalDifference: 43,
        points: 99999,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("scrapedFixtureSchema", () => {
    it("accepts a valid fixture", () => {
      const r = scrapedFixtureSchema.safeParse({
        date: "2026-04-25",
        time: "20:00",
        saffHomeTeamId: 1,
        homeTeamNameEn: "Al Hilal",
        homeTeamNameAr: "الهلال",
        saffAwayTeamId: 2,
        awayTeamNameEn: "Al Nassr",
        awayTeamNameAr: "النصر",
        homeScore: 2,
        awayScore: 1,
        stadium: "Kingdom Arena",
        city: "Riyadh",
      });
      expect(r.success).toBe(true);
    });

    it("rejects invalid date format", () => {
      const r = scrapedFixtureSchema.safeParse({
        date: "25-04-2026",
        time: "20:00",
        saffHomeTeamId: 1,
        homeTeamNameEn: "A",
        homeTeamNameAr: "",
        saffAwayTeamId: 2,
        awayTeamNameEn: "B",
        awayTeamNameAr: "",
        homeScore: null,
        awayScore: null,
        stadium: "",
        city: "",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("uploadPayloadSchema", () => {
    it("accepts a complete payload", () => {
      const r = uploadPayloadSchema.safeParse({
        tournamentId: 333,
        season: "2025-2026",
        standings: [],
        fixtures: [],
        teams: [],
      });
      expect(r.success).toBe(true);
    });
  });
});
