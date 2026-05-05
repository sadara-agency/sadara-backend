/**
 * Unit tests for syncPlayerFromSaffPlus + previewPlayerProfile
 *
 * All Sequelize models are mocked — no DB required.
 */

import {
  syncPlayerFromSaffPlus,
  previewPlayerProfile,
  autoLinkPlayerToSaffPlus,
} from "./saffplus.service";
import type { SaffPlusPlayerProfile } from "./saffplus.types";
import type { AuthUser } from "@shared/types";

// ── Module mocks ────────────────────────────────────────────────────────────

jest.mock("./saffplus.provider", () => ({
  fetchPlayerProfile: jest.fn(),
  searchSaffPlusPlayersByName: jest.fn(),
  isWomensCompetition: jest.fn(),
  normalizeArabicName: jest.fn((s: string) => s),
}));

jest.mock("@modules/players/player.model", () => ({
  Player: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@modules/players/externalProvider.model", () => ({
  ExternalProviderMapping: {
    upsert: jest.fn(),
  },
}));

jest.mock("@modules/players/playerClubHistory.model", () => ({
  PlayerClubHistory: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@modules/clubs/club.model", () => ({
  Club: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock("@modules/matches/match.model", () => ({
  Match: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("@modules/matches/matchPlayer.model", () => ({
  MatchPlayer: {
    upsert: jest.fn(),
  },
}));

jest.mock(
  "@modules/player-coach-assignments/playerCoachAssignment.model",
  () => ({
    PlayerCoachAssignment: {
      findAll: jest.fn(),
    },
  }),
);

jest.mock("@modules/notifications/notification.service", () => ({
  notifyUser: jest.fn().mockResolvedValue(null),
  notifyByRole: jest.fn().mockResolvedValue(0),
  createNotification: jest.fn().mockResolvedValue(null),
}));

jest.mock("@config/database", () => ({
  sequelize: {
    transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) =>
      cb({}),
    ),
  },
}));

// ── Transitive model mocks (saffplus.service.ts imports these at module level) ──

jest.mock("@modules/squads/squad.model", () => ({
  Squad: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    name: "Squad",
  },
}));

jest.mock("@modules/squads/squadMembership.model", () => ({
  SquadMembership: {
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    create: jest.fn(),
    name: "SquadMembership",
  },
}));

jest.mock("@modules/squads/squad.service", () => ({
  findOrCreateSquad: jest.fn().mockResolvedValue([{ id: "squad-1" }, true]),
}));

jest.mock("./playerReview.service", () => ({
  upsertPendingReview: jest.fn().mockResolvedValue({}),
}));

jest.mock("./playerReview.model", () => ({}));

jest.mock("@modules/matches/matchEvent.model", () => ({
  MatchEvent: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
    name: "MatchEvent",
  },
}));

jest.mock("@modules/matches/matchMedia.model", () => ({
  MatchMedia: {
    findOrCreate: jest.fn(),
    findAll: jest.fn(),
    name: "MatchMedia",
  },
}));

jest.mock("./saffplus.video", () => ({
  extractMatchVideoUrl: jest.fn(),
  renderSaffPlusPage: jest.fn(),
}));

jest.mock("@modules/saff/saff.service", () => ({
  fetchFromSaff: jest.fn(),
  importToSadara: jest.fn(),
  getCurrentSeason: jest.fn().mockReturnValue("2025-2026"),
  getMenLeagueSaffIds: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
}));

jest.mock("@modules/competitions/competition.model", () => ({
  Competition: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOrCreate: jest.fn(),
    name: "Competition",
  },
}));

jest.mock("@modules/saff/seasonSync.model", () => ({
  SeasonSync: { upsert: jest.fn(), findOne: jest.fn(), name: "SeasonSync" },
}));

// Silence logger during tests
jest.mock("@config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ── Imports after mocks ─────────────────────────────────────────────────────

import * as provider from "./saffplus.provider";
import { Player } from "@modules/players/player.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import { PlayerClubHistory } from "@modules/players/playerClubHistory.model";
import { Club } from "@modules/clubs/club.model";
import { Match } from "@modules/matches/match.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerCoachAssignment } from "@modules/player-coach-assignments/playerCoachAssignment.model";
import { notifyUser } from "@modules/notifications/notification.service";
import { upsertPendingReview } from "./playerReview.service";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockPlayer = (overrides: Record<string, unknown> = {}) => ({
  id: "player-uuid",
  firstName: null,
  lastName: null,
  firstNameAr: null,
  lastNameAr: null,
  dateOfBirth: null,
  nationality: null,
  position: null,
  photoUrl: null,
  currentClubId: null,
  externalIds: {},
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const baseProfile: SaffPlusPlayerProfile = {
  saffPlayerId: "saff-123",
  nameEn: "Fahad Saleh",
  nameAr: "فهد سالم",
  position: "GK",
  dateOfBirth: "2008-01-15",
  nationality: "SAU",
  photoUrl: "https://cdn.saffplus.sa/photo.jpg",
  teams: [
    {
      saffTeamId: 10,
      name: "Al Hilal",
      nameAr: "الهلال",
      logoUrl: null,
      from: "2024-01-01",
      to: null,
    },
  ],
  recentMatches: [
    {
      id: "m-001",
      competitionId: "c-1",
      date: "2025-04-01",
      homeTeamId: 10,
      homeTeamName: "Al Hilal",
      awayTeamId: 20,
      awayTeamName: "Al Ahly",
      homeScore: 2,
      awayScore: 1,
      status: "finished",
      lineupRole: "starter",
    },
  ],
  upcomingMatches: [
    {
      id: "m-002",
      competitionId: "c-1",
      date: "2025-05-10",
      homeTeamId: 10,
      homeTeamName: "Al Hilal",
      awayTeamId: 30,
      awayTeamName: "Al Nassr",
      status: "scheduled",
      // no lineupRole — should be skipped
    },
  ],
};

const mockInitiator: AuthUser = {
  id: "initiator-uuid",
  role: "Manager",
  email: "manager@sadara.sa",
  fullName: "Test Manager",
};

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (PlayerCoachAssignment.findAll as jest.Mock).mockResolvedValue([]);
});

describe("previewPlayerProfile", () => {
  it("returns the profile from provider", async () => {
    (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(baseProfile);
    const result = await previewPlayerProfile("saff-123");
    expect(result).toBe(baseProfile);
    expect(Player.create).not.toHaveBeenCalled();
  });

  it("throws 404 when provider returns null", async () => {
    (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(null);
    await expect(previewPlayerProfile("saff-xxx")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("throws 502 on provider error", async () => {
    (provider.fetchPlayerProfile as jest.Mock).mockRejectedValue(
      new Error("timeout"),
    );
    await expect(previewPlayerProfile("saff-xxx")).rejects.toMatchObject({
      statusCode: 502,
    });
  });
});

describe("syncPlayerFromSaffPlus", () => {
  describe("player resolution", () => {
    it("throws 404 when sadaraPlayerId does not exist", async () => {
      (Player.findByPk as jest.Mock).mockResolvedValue(null);
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(baseProfile);
      await expect(
        syncPlayerFromSaffPlus("missing-uuid", "saff-123", {}, mockInitiator),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws 404 when SAFF+ profile not found", async () => {
      (Player.findByPk as jest.Mock).mockResolvedValue(mockPlayer());
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(null);
      await expect(
        syncPlayerFromSaffPlus("player-uuid", "saff-xxx", {}, mockInitiator),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(ExternalProviderMapping.upsert).not.toHaveBeenCalled();
    });
  });

  describe("field enrichment", () => {
    it("fills null fields and never calls Player.create", async () => {
      const player = mockPlayer();
      (Player.findByPk as jest.Mock).mockResolvedValue(player);
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(baseProfile);
      (Club.findOne as jest.Mock).mockResolvedValue(null);
      (Match.findOne as jest.Mock).mockResolvedValue(null);

      const result = await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        {},
        mockInitiator,
      );

      expect(Player.create).not.toHaveBeenCalled();
      expect(player.update).toHaveBeenCalled();
      expect(result.enriched).toContain("firstName");
      expect(result.enriched).toContain("firstNameAr");
      expect(result.enriched).toContain("dateOfBirth");
      expect(result.enriched).toContain("nationality");
      expect(result.enriched).toContain("position");
      expect(result.enriched).toContain("photoUrl");
    });

    it("does NOT replace existing non-null fields when overwrite=false", async () => {
      const player = mockPlayer({
        firstName: "Existing",
        firstNameAr: "موجود",
      });
      (Player.findByPk as jest.Mock).mockResolvedValue(player);
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(baseProfile);
      (Club.findOne as jest.Mock).mockResolvedValue(null);
      (Match.findOne as jest.Mock).mockResolvedValue(null);

      const result = await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        { overwrite: false },
        mockInitiator,
      );

      expect(result.enriched).not.toContain("firstName");
      expect(result.enriched).not.toContain("firstNameAr");
    });

    it("replaces existing fields when overwrite=true", async () => {
      const player = mockPlayer({
        firstName: "Old",
        firstNameAr: "قديم",
      });
      (Player.findByPk as jest.Mock).mockResolvedValue(player);
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(baseProfile);
      (Club.findOne as jest.Mock).mockResolvedValue(null);
      (Match.findOne as jest.Mock).mockResolvedValue(null);

      const result = await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        { overwrite: true },
        mockInitiator,
      );

      expect(result.enriched).toContain("firstName");
      expect(result.enriched).toContain("firstNameAr");
    });
  });

  describe("club linking", () => {
    it("links existing club and skips unknown clubs", async () => {
      const profileWithTwoTeams: SaffPlusPlayerProfile = {
        ...baseProfile,
        teams: [
          {
            saffTeamId: 10,
            name: "Al Hilal",
            nameAr: "الهلال",
            logoUrl: null,
            from: "2024-01-01",
            to: null,
          },
          {
            saffTeamId: 99,
            name: "Unknown FC",
            nameAr: "نادي مجهول",
            logoUrl: null,
            from: "2023-01-01",
            to: "2023-12-31",
          },
        ],
      };

      (Player.findByPk as jest.Mock).mockResolvedValue(mockPlayer());
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(
        profileWithTwoTeams,
      );
      (Club.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: "club-hilal-uuid" }) // team 10 → found
        .mockResolvedValueOnce(null); // team 99 → not found
      (PlayerClubHistory.findOne as jest.Mock).mockResolvedValue(null);
      (Match.findOne as jest.Mock).mockResolvedValue(null);

      const result = await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        {},
        mockInitiator,
      );

      expect(result.clubsLinked).toBe(1);
      expect(result.clubsSkipped).toBe(1);
      expect(PlayerClubHistory.create).toHaveBeenCalledTimes(1);
    });

    it("skips teams with alphanumeric Motto ids (no numeric DB equivalent)", async () => {
      const profileWithMottoTeam: SaffPlusPlayerProfile = {
        ...baseProfile,
        teams: [
          {
            saffTeamId: "X1g7ZnvonEaF6_Z0C1FzC",
            name: "Al Nassr U17",
            nameAr: "النصر-تحت17",
            logoUrl: null,
            from: "2025-09-01",
            to: null,
          },
        ],
        recentMatches: [],
        upcomingMatches: [],
      };

      (Player.findByPk as jest.Mock).mockResolvedValue(mockPlayer());
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(
        profileWithMottoTeam,
      );
      (Match.findOne as jest.Mock).mockResolvedValue(null);

      const result = await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        {},
        mockInitiator,
      );

      expect(result.clubsSkipped).toBe(1);
      expect(result.clubsLinked).toBe(0);
      expect(Club.findOne).not.toHaveBeenCalled();
    });
  });

  describe("match linking", () => {
    it("links only matches with known lineupRole that exist in Sadara", async () => {
      const profileWithMatches: SaffPlusPlayerProfile = {
        ...baseProfile,
        recentMatches: [
          { ...baseProfile.recentMatches[0], lineupRole: "starter" },
          { ...baseProfile.recentMatches[0], id: "m-no-role" }, // no lineupRole
          {
            ...baseProfile.recentMatches[0],
            id: "m-not-in-db",
            lineupRole: "bench",
          }, // not in DB
        ],
        upcomingMatches: [],
        teams: [],
      };

      (Player.findByPk as jest.Mock).mockResolvedValue(mockPlayer());
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue(
        profileWithMatches,
      );
      (Club.findOne as jest.Mock).mockResolvedValue(null);
      (Match.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: "match-db-uuid" }) // m-001 → found
        .mockResolvedValueOnce(null); // m-not-in-db → not found

      const result = await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        {},
        mockInitiator,
      );

      expect(result.matchesLinked).toBe(1);
      expect(result.matchesSkipped).toBe(2); // m-no-role + m-not-in-db
      expect(MatchPlayer.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("notification fan-out", () => {
    it("notifies assigned staff + initiator, de-duplicated", async () => {
      (Player.findByPk as jest.Mock).mockResolvedValue(mockPlayer());
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue({
        ...baseProfile,
        teams: [],
        recentMatches: [],
        upcomingMatches: [],
      });

      (PlayerCoachAssignment.findAll as jest.Mock).mockResolvedValue([
        { coachUserId: "staff-1" },
        { coachUserId: "staff-2" },
        { coachUserId: "initiator-uuid" }, // same as initiator — should dedup
      ]);

      const result = await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        {},
        mockInitiator,
      );

      // staff-1 + staff-2 + initiator-uuid = 3 unique users
      expect(notifyUser).toHaveBeenCalledTimes(3);
      expect(result.notifiedUserIds).toHaveLength(3);
      expect(result.notifiedUserIds).toContain("initiator-uuid");
    });
  });

  describe("ExternalProviderMapping upsert", () => {
    it("upserts the provider mapping with saffPlayerId", async () => {
      (Player.findByPk as jest.Mock).mockResolvedValue(mockPlayer());
      (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue({
        ...baseProfile,
        teams: [],
        recentMatches: [],
        upcomingMatches: [],
      });

      await syncPlayerFromSaffPlus(
        "player-uuid",
        "saff-123",
        {},
        mockInitiator,
      );

      expect(ExternalProviderMapping.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: "player-uuid",
          externalPlayerId: "saff-123",
        }),
        expect.any(Object),
      );
    });
  });
});

// ── autoLinkPlayerToSaffPlus ────────────────────────────────────────────────

const mockCandidate = (overrides: Record<string, unknown> = {}) => ({
  saffPlayerId: "saff-abc",
  nameAr: "فهد سالم",
  nameEn: "Fahad Saleh",
  dateOfBirth: "2000-05-10",
  currentTeamSaffId: 10,
  ...overrides,
});

describe("autoLinkPlayerToSaffPlus", () => {
  it("skips when player not found", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(null);
    const result = await autoLinkPlayerToSaffPlus("missing-uuid");
    expect(result.outcome).toBe("skipped");
    expect(result.reason).toMatch(/not found/);
  });

  it("skips when player already has external_ids.saffplus", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(
      mockPlayer({ externalIds: { saffplus: "saff-existing" } }),
    );
    const result = await autoLinkPlayerToSaffPlus("player-uuid");
    expect(result.outcome).toBe("skipped");
    expect(result.reason).toMatch(/already linked/);
    expect(provider.searchSaffPlusPlayersByName).not.toHaveBeenCalled();
  });

  it("skips when player has no name", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(
      mockPlayer({
        firstName: "",
        lastName: "",
        firstNameAr: null,
        lastNameAr: null,
      }),
    );
    const result = await autoLinkPlayerToSaffPlus("player-uuid");
    expect(result.outcome).toBe("skipped");
    expect(result.reason).toMatch(/no name/);
  });

  it("skips when SAFF+ returns no candidates", async () => {
    (Player.findByPk as jest.Mock).mockResolvedValue(
      mockPlayer({ firstNameAr: "فهد", lastNameAr: "سالم" }),
    );
    (Club.findByPk as jest.Mock).mockResolvedValue(null);
    (provider.searchSaffPlusPlayersByName as jest.Mock).mockResolvedValue([]);
    const result = await autoLinkPlayerToSaffPlus("player-uuid");
    expect(result.outcome).toBe("skipped");
    expect(result.reason).toMatch(/no SAFF\+ candidates/);
  });

  it("auto-links when name + club both match (threshold 0.70)", async () => {
    const player = mockPlayer({
      firstNameAr: "فهد",
      lastNameAr: "سالم",
      currentClubId: "club-uuid",
    });
    (Player.findByPk as jest.Mock).mockResolvedValue(player);
    (Club.findByPk as jest.Mock).mockResolvedValue({ saffTeamId: 10 });
    // Same name → trigram similarity ≥ 0.90, club matches → auto-link
    (provider.searchSaffPlusPlayersByName as jest.Mock).mockResolvedValue([
      mockCandidate({ currentTeamSaffId: 10 }),
    ]);
    // fetchPlayerProfile is called fire-and-forget — mock it so it doesn't throw
    (provider.fetchPlayerProfile as jest.Mock).mockResolvedValue({
      ...baseProfile,
      teams: [],
      recentMatches: [],
      upcomingMatches: [],
    });

    const result = await autoLinkPlayerToSaffPlus("player-uuid");

    expect(result.outcome).toBe("linked");
    expect(result.saffPlayerId).toBe("saff-abc");
    expect(player.update).toHaveBeenCalledWith(
      expect.objectContaining({
        externalIds: expect.objectContaining({ saffplus: "saff-abc" }),
      }),
    );
  });

  it("queues for review when name is similar but club does not match", async () => {
    const player = mockPlayer({
      firstNameAr: "فهد",
      lastNameAr: "سالم",
      currentClubId: "club-uuid",
    });
    (Player.findByPk as jest.Mock).mockResolvedValue(player);
    (Club.findByPk as jest.Mock).mockResolvedValue({ saffTeamId: 99 }); // different club
    (provider.searchSaffPlusPlayersByName as jest.Mock).mockResolvedValue([
      // Similar name but not identical (extra surname) → score ~0.7, below 0.92 name-alone threshold
      // Club mismatch (10 ≠ 99) prevents auto-link → queued for review
      mockCandidate({ nameAr: "فهد سالم العتيبي", currentTeamSaffId: 10 }),
    ]);

    const result = await autoLinkPlayerToSaffPlus("player-uuid");

    expect(result.outcome).toBe("queued");
    expect(upsertPendingReview).toHaveBeenCalled();
    expect(player.update).not.toHaveBeenCalled();
  });

  it("skips when best candidate is below 0.50 similarity", async () => {
    const player = mockPlayer({ firstNameAr: "خالد", lastNameAr: "المطيري" });
    (Player.findByPk as jest.Mock).mockResolvedValue(player);
    (Club.findByPk as jest.Mock).mockResolvedValue(null);
    // Completely different name → very low similarity
    (provider.searchSaffPlusPlayersByName as jest.Mock).mockResolvedValue([
      mockCandidate({
        nameAr: "زياد بوعزة",
        nameEn: "Ziyad Bouazza",
        currentTeamSaffId: null,
      }),
    ]);

    const result = await autoLinkPlayerToSaffPlus("player-uuid");

    expect(result.outcome).toBe("skipped");
    expect(upsertPendingReview).not.toHaveBeenCalled();
  });
});
