/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/dashboard/portfolioAnalytics.service.test.ts
// Unit tests for the Player Portfolio Analytics sub-service.
// Raw SQL only — sequelize.query is mocked. cacheOrFetch runs for
// real but Redis is disconnected in tests, so every call falls
// through to the fetch fn (and thus to sequelize.query).
// ─────────────────────────────────────────────────────────────

jest.mock("../../../src/config/database", () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    QueryTypes: { SELECT: "SELECT" },
  },
}));

jest.mock("../../../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Redis disconnected → cacheOrFetch always calls through to the DB.
jest.mock("../../../src/config/redis", () => ({
  getRedisClient: jest.fn(() => null),
  isRedisConnected: jest.fn(() => false),
}));

import * as svc from "../../../src/modules/dashboard/portfolioAnalytics.service";
const { sequelize } = require("../../../src/config/database");

const q = sequelize.query as jest.Mock;

describe("portfolioAnalytics.service", () => {
  beforeEach(() => jest.clearAllMocks());

  // ── normalizePeriod (period whitelist) ──────────────────

  describe("normalizePeriod", () => {
    it("accepts each allowed period (number)", () => {
      expect(svc.normalizePeriod(30)).toBe(30);
      expect(svc.normalizePeriod(90)).toBe(90);
      expect(svc.normalizePeriod(365)).toBe(365);
    });

    it("accepts allowed periods passed as numeric strings", () => {
      expect(svc.normalizePeriod("30")).toBe(30);
      expect(svc.normalizePeriod("365")).toBe(365);
    });

    it("falls back to the default for disallowed / junk values", () => {
      expect(svc.normalizePeriod(7)).toBe(svc.DEFAULT_PERIOD);
      expect(svc.normalizePeriod(180)).toBe(svc.DEFAULT_PERIOD);
      expect(svc.normalizePeriod("abc")).toBe(svc.DEFAULT_PERIOD);
      expect(svc.normalizePeriod(undefined)).toBe(svc.DEFAULT_PERIOD);
      expect(svc.normalizePeriod(null)).toBe(svc.DEFAULT_PERIOD);
      expect(svc.normalizePeriod({})).toBe(svc.DEFAULT_PERIOD);
    });
  });

  // ── A. getDistributions ─────────────────────────────────

  describe("getDistributions", () => {
    // Order of queries inside fetchDistributions:
    // 0..5 (Promise.all): nationality, contract_type, position,
    //                     preferred_foot, player_type, mandate_status
    // 6 club, 7 city, 8 age, 9 height, 10 career
    const wireDistributions = () => {
      q.mockResolvedValueOnce([{ key: "Saudi Arabia", count: 10 }]) // nationality
        .mockResolvedValueOnce([{ key: "Professional", count: 12 }]) // contract_type
        .mockResolvedValueOnce([{ key: "Striker", count: 4 }]) // position
        .mockResolvedValueOnce([{ key: "Right", count: 8 }]) // preferred_foot
        .mockResolvedValueOnce([{ key: "Pro", count: 11 }]) // player_type
        .mockResolvedValueOnce([{ key: "Signed", count: 6 }]) // mandate_status
        .mockResolvedValueOnce([{ key: "Al Hilal", count: 5 }]) // club
        .mockResolvedValueOnce([{ key: "Riyadh", count: 7 }]) // city
        .mockResolvedValueOnce([{ key: "22-25", count: 9 }]) // age
        .mockResolvedValueOnce([{ key: "180-189", count: 6 }]) // height
        .mockResolvedValueOnce([{ key: "PeakPerformer", count: 3 }]) // career
        .mockResolvedValueOnce([]); // posPlayerRows (pitch tooltip)
    };

    it("returns all 11 distribution dimensions on the happy path", async () => {
      wireDistributions();
      const result = await svc.getDistributions();

      expect(result.nationality).toEqual([
        { key: "Saudi Arabia", count: 10 },
      ]);
      expect(result.contractType).toEqual([
        { key: "Professional", count: 12 },
      ]);
      expect(result.position).toEqual([{ key: "Striker", count: 4 }]);
      expect(result.preferredFoot).toEqual([{ key: "Right", count: 8 }]);
      expect(result.playerType).toEqual([{ key: "Pro", count: 11 }]);
      expect(result.mandateStatus).toEqual([{ key: "Signed", count: 6 }]);
      expect(result.club).toEqual([{ key: "Al Hilal", count: 5 }]);
      expect(result.city).toEqual([{ key: "Riyadh", count: 7 }]);
      expect(result.ageGroup).toEqual([{ key: "22-25", count: 9 }]);
      expect(result.height).toEqual([{ key: "180-189", count: 6 }]);
      expect(result.careerStage).toEqual([
        { key: "PeakPerformer", count: 3 },
      ]);
      expect(q).toHaveBeenCalledTimes(12);
    });

    it("coalesces null keys to explicit buckets and casts counts to numbers", async () => {
      q.mockResolvedValueOnce([{ key: null, count: "2" }]) // nationality → Unknown
        .mockResolvedValueOnce([{ key: null, count: "1" }]) // contract_type → Unknown
        .mockResolvedValueOnce([{ key: null, count: "3" }]) // position → Unassigned
        .mockResolvedValueOnce([{ key: null, count: "1" }]) // preferred_foot → Unknown
        .mockResolvedValueOnce([{ key: null, count: "1" }]) // player_type → Unknown
        .mockResolvedValueOnce([{ key: null, count: "4" }]) // mandate_status → None
        .mockResolvedValueOnce([{ key: null, count: "5" }]) // club → Unattached
        .mockResolvedValueOnce([{ key: null, count: "2" }]) // city → Unknown
        .mockResolvedValueOnce([]) // age empty
        .mockResolvedValueOnce([]) // height empty
        .mockResolvedValueOnce([{ key: "Unclassified", count: "8" }]) // career
        .mockResolvedValueOnce([]); // posPlayerRows (pitch tooltip)

      const result = await svc.getDistributions();

      expect(result.nationality).toEqual([{ key: "Unknown", count: 2 }]);
      expect(result.position).toEqual([{ key: "Unassigned", count: 3 }]);
      expect(result.mandateStatus).toEqual([{ key: "None", count: 4 }]);
      expect(result.club).toEqual([{ key: "Unattached", count: 5 }]);
      expect(result.city).toEqual([{ key: "Unknown", count: 2 }]);
      expect(result.careerStage).toEqual([
        { key: "Unclassified", count: 8 },
      ]);
      // Empty bucketed dims collapse to []
      expect(result.ageGroup).toEqual([]);
      expect(result.height).toEqual([]);
    });

    it("folds high-cardinality nationality to top-15 + 'Other'", async () => {
      const many = Array.from({ length: 20 }, (_, i) => ({
        key: `Nat${i}`,
        count: 20 - i, // pre-sorted desc
      }));
      q.mockResolvedValueOnce(many) // nationality (20 distinct)
        .mockResolvedValueOnce([]) // contract_type
        .mockResolvedValueOnce([]) // position
        .mockResolvedValueOnce([]) // preferred_foot
        .mockResolvedValueOnce([]) // player_type
        .mockResolvedValueOnce([]) // mandate_status
        .mockResolvedValueOnce([]) // club
        .mockResolvedValueOnce([]) // city
        .mockResolvedValueOnce([]) // age
        .mockResolvedValueOnce([]) // height
        .mockResolvedValueOnce([]) // career
        .mockResolvedValueOnce([]); // posPlayerRows (pitch tooltip)

      const result = await svc.getDistributions();

      expect(result.nationality).toHaveLength(16); // 15 + Other
      expect(result.nationality[15].key).toBe("Other");
      // Other = sum of counts 5..1 (the 5 folded tail rows: counts 5,4,3,2,1)
      const tail = many.slice(15).reduce((s, b) => s + b.count, 0);
      expect(result.nationality[15].count).toBe(tail);
    });

    it("orders age buckets in fixed display order regardless of query order", async () => {
      q.mockResolvedValueOnce([]) // nationality
        .mockResolvedValueOnce([]) // contract_type
        .mockResolvedValueOnce([]) // position
        .mockResolvedValueOnce([]) // preferred_foot
        .mockResolvedValueOnce([]) // player_type
        .mockResolvedValueOnce([]) // mandate_status
        .mockResolvedValueOnce([]) // club
        .mockResolvedValueOnce([]) // city
        .mockResolvedValueOnce([
          { key: "30+", count: 2 },
          { key: "U18", count: 5 },
          { key: "22-25", count: 3 },
        ]) // age — out of order
        .mockResolvedValueOnce([]) // height
        .mockResolvedValueOnce([]) // career
        .mockResolvedValueOnce([]); // posPlayerRows (pitch tooltip)

      const result = await svc.getDistributions();

      expect(result.ageGroup.map((b) => b.key)).toEqual([
        "U18",
        "22-25",
        "30+",
      ]);
    });
  });

  // ── B. getKpis ──────────────────────────────────────────

  describe("getKpis", () => {
    // Query order: base(total,avg_age), rating, dev, ready, negotiation
    it("returns numeric KPIs on the happy path", async () => {
      q.mockResolvedValueOnce([{ total: 42, avg_age: "24.7" }]) // base
        .mockResolvedValueOnce([{ avg_rating: "7.234" }]) // rating
        .mockResolvedValueOnce([{ count: 9 }]) // dev
        .mockResolvedValueOnce([{ count: 4 }]) // ready
        .mockResolvedValueOnce([{ count: 2 }]); // negotiation

      const result = await svc.getKpis();

      expect(result).toEqual({
        totalPlayers: 42,
        averageAge: 24.7,
        avgTechnicalRating: 7.23,
        underDevelopment: 9,
        readyForMarketing: 4,
        underNegotiation: 2,
      });
    });

    it("returns null ratings/age when there is no data", async () => {
      q.mockResolvedValueOnce([{ total: 0, avg_age: null }]) // base
        .mockResolvedValueOnce([{ avg_rating: null }]) // rating
        .mockResolvedValueOnce([{ count: 0 }]) // dev
        .mockResolvedValueOnce([{ count: 0 }]) // ready
        .mockResolvedValueOnce([{ count: 0 }]); // negotiation

      const result = await svc.getKpis();

      expect(result.totalPlayers).toBe(0);
      expect(result.averageAge).toBeNull();
      expect(result.avgTechnicalRating).toBeNull();
      expect(result.underDevelopment).toBe(0);
      expect(result.readyForMarketing).toBe(0);
      expect(result.underNegotiation).toBe(0);
    });

    it("tolerates empty result rows (undefined row → zero/null)", async () => {
      q.mockResolvedValueOnce([]) // base
        .mockResolvedValueOnce([]) // rating
        .mockResolvedValueOnce([]) // dev
        .mockResolvedValueOnce([]) // ready
        .mockResolvedValueOnce([]); // negotiation

      const result = await svc.getKpis();

      expect(result.totalPlayers).toBe(0);
      expect(result.averageAge).toBeNull();
      expect(result.avgTechnicalRating).toBeNull();
    });
  });

  // ── C. getPositions ─────────────────────────────────────

  describe("getPositions", () => {
    it("slices most- and least-represented from present positions", async () => {
      q.mockResolvedValueOnce([
        { key: "Striker", count: 8 },
        { key: "Center Back", count: 6 },
        { key: "Midfielder", count: 5 },
        { key: "Right Back", count: 4 },
        { key: "Left Back", count: 3 },
        { key: "Goalkeeper", count: 2 },
        { key: "Left Winger", count: 1 },
      ]);

      const result = await svc.getPositions();

      expect(result.all).toHaveLength(7);
      expect(result.mostRepresented.map((b) => b.key)).toEqual([
        "Striker",
        "Center Back",
        "Midfielder",
        "Right Back",
        "Left Back",
      ]);
      // least = bottom 5 by count (reverse of the desc list)
      expect(result.leastRepresented.map((b) => b.key)).toEqual([
        "Left Winger",
        "Goalkeeper",
        "Left Back",
        "Right Back",
        "Midfielder",
      ]);
    });

    it("handles an empty roster (no present positions)", async () => {
      q.mockResolvedValueOnce([]);
      const result = await svc.getPositions();
      expect(result.all).toEqual([]);
      expect(result.mostRepresented).toEqual([]);
      expect(result.leastRepresented).toEqual([]);
    });
  });

  // ── D. getRankings ──────────────────────────────────────

  describe("getRankings", () => {
    const rankRow = {
      id: "p1",
      first_name: "Salem",
      last_name: "Al-Dawsari",
      first_name_ar: "سالم",
      last_name_ar: "الدوسري",
      position: "Left Winger",
      photo_url: "key.jpg",
      club_name: "Al Hilal",
      value: "8.40",
    };

    it("maps ranked rows and builds full names; defaults period to 90", async () => {
      q.mockResolvedValueOnce([rankRow]) // top-rated
        .mockResolvedValueOnce([]); // most-improved

      const result = await svc.getRankings();

      expect(result.period).toBe(90);
      expect(result.topRated).toEqual([
        {
          id: "p1",
          fullName: "Salem Al-Dawsari",
          fullNameAr: "سالم الدوسري",
          position: "Left Winger",
          photoUrl: "key.jpg",
          clubName: "Al Hilal",
          value: 8.4,
        },
      ]);
      expect(result.mostImproved).toEqual([]);
    });

    it("returns fullNameAr=null when an Arabic name part is missing", async () => {
      q.mockResolvedValueOnce([{ ...rankRow, last_name_ar: null }]) // top-rated
        .mockResolvedValueOnce([]); // most-improved

      const result = await svc.getRankings(30);

      expect(result.period).toBe(30);
      expect(result.topRated[0].fullNameAr).toBeNull();
    });

    it("normalizes a disallowed period to the default", async () => {
      q.mockResolvedValueOnce([]) // top-rated
        .mockResolvedValueOnce([]); // most-improved

      const result = await svc.getRankings(7);
      expect(result.period).toBe(svc.DEFAULT_PERIOD);
    });

    it("returns empty rankings when there are no match stats", async () => {
      q.mockResolvedValueOnce([]) // top-rated
        .mockResolvedValueOnce([]); // most-improved

      const result = await svc.getRankings(365);
      expect(result.topRated).toEqual([]);
      expect(result.mostImproved).toEqual([]);
    });
  });

  // ── E. getPortfolioAll ──────────────────────────────────

  describe("getPortfolioAll", () => {
    it("aggregates A–D into one object at the default period", async () => {
      // getPortfolioAll uses Promise.all([getDistributions, getKpis, getPositions,
      // getRankings]), so their first queries fire concurrently before any await
      // resolves. The mock queue must match the actual interleaved firing order:
      //
      //  First wave (all fire before any await resolves):
      //   0–5  distributions → Promise.all([groupBy×6]):
      //           nationality, contract_type, position, preferred_foot,
      //           player_type, mandate_status
      //   6    kpis     → baseRows (first await in fetchKpis)
      //   7    positions → rows   (only query in fetchPositions)
      //   8    rankings → topRatedRows (first await in fetchRankings)
      //
      //  Sequential continuations (fire as each preceding await resolves,
      //  in registration order: dist → kpis → rankings):
      //   9    distributions → clubRows
      //  10    kpis          → ratingRows
      //  11    rankings      → mostImprovedRows
      //  12    distributions → cityRows
      //  13    kpis          → devRows
      //  14    distributions → ageRows
      //  15    kpis          → readyRows
      //  16    distributions → heightRows
      //  17    kpis          → negotiationRows
      //  18    distributions → careerRows

      const responses: Record<number, unknown> = {
        6:  [{ total: 1, avg_age: "20" }], // kpis baseRows  → totalPlayers = 1
        7:  [{ key: "Striker", count: 1 }], // positions rows
        10: [{ avg_rating: null }],          // kpis ratingRows
        13: [{ count: 0 }],                  // kpis devRows
        15: [{ count: 0 }],                  // kpis readyRows
        17: [{ count: 0 }],                  // kpis negotiationRows
      };
      let callIdx = 0;
      q.mockImplementation(() =>
        Promise.resolve(responses[callIdx++] ?? []),
      );

      const result = await svc.getPortfolioAll();

      expect(result).toHaveProperty("nationality");
      expect(result).toHaveProperty("careerStage");
      expect(result.kpis.totalPlayers).toBe(1);
      expect(result.positions.all).toEqual([{ key: "Striker", count: 1 }]);
      expect(result.rankings.period).toBe(svc.DEFAULT_PERIOD);
    });
  });
});
