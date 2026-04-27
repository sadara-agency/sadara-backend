jest.mock("@config/database", () => ({
  sequelize: {
    transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) =>
      cb({}),
    ),
    query: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("@config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@modules/players/player.model", () => ({
  Player: { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() },
}));

jest.mock("@modules/clubs/club.model", () => ({
  Club: { findOne: jest.fn() },
}));

jest.mock("@modules/players/externalProvider.model", () => ({
  ExternalProviderMapping: {
    findOne: jest.fn(),
    upsert: jest.fn(),
  },
}));

jest.mock("@modules/spl/spl.scraper", () => ({
  scrapePlayerProfile: jest.fn(),
  scrapeTeamRoster: jest.fn(),
}));

jest.mock("@modules/spl/spl.pulselive", () => ({
  fetchPlayerStats: jest.fn(),
}));

jest.mock("@modules/spl/spl.registry", () => ({
  SPL_CLUB_REGISTRY: [],
}));

jest.mock("@shared/utils/providerPriority", () => ({
  canOverwrite: jest.fn().mockReturnValue(true),
  PERFORMANCE_PRIORITY: {},
}));

import { syncPlayer } from "@modules/spl/spl.sync";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { ExternalProviderMapping } from "@modules/players/externalProvider.model";
import { scrapePlayerProfile } from "@modules/spl/spl.scraper";

describe("syncPlayer — transaction rollback", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rolls back when an inner write throws — Player.create failure aborts the whole resolvePlayer", async () => {
    (scrapePlayerProfile as jest.Mock).mockResolvedValue({
      bio: {
        splPlayerId: "spl-1",
        fullName: "Ali Salem",
        slug: "ali-salem",
        photoUrl: null,
        heightCm: null,
        jerseyNumber: null,
        position: null,
        splTeamId: null,
        pulseLiveId: null,
        nationality: null,
        dateOfBirth: null,
      },
      currentSeasonStats: null,
    });

    // No mapping, no fuzzy match → falls through to Player.create
    (ExternalProviderMapping.findOne as jest.Mock).mockResolvedValue(null);
    (Player.findOne as jest.Mock).mockResolvedValue(null);
    (Player.create as jest.Mock).mockRejectedValue(
      new Error("DB write failed"),
    );

    await expect(syncPlayer("spl-1")).rejects.toThrow("DB write failed");

    // The transaction callback was entered (sequelize.transaction was invoked).
    expect(
      (sequelize as unknown as { transaction: jest.Mock }).transaction,
    ).toHaveBeenCalledTimes(1);
    // ExternalProviderMapping.upsert must NOT run after Player.create threw —
    // the transaction callback bailed before it was reached.
    expect(ExternalProviderMapping.upsert).not.toHaveBeenCalled();
  });
});
