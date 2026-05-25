import { AppError } from "@middleware/errorHandler";

jest.mock("@config/database", () => ({ sequelize: { query: jest.fn() } }));
jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const mockFindOne = jest.fn();
const mockFindAll = jest.fn();
const mockUpsert = jest.fn();

jest.mock("./playerStats.model", () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findAll: (...args: unknown[]) => mockFindAll(...args),
    upsert: (...args: unknown[]) => mockUpsert(...args),
  },
}));

const mockMatchStatsSum = jest.fn();
jest.mock("@modules/matches/playerMatchStats.model", () => ({
  __esModule: true,
  PlayerMatchStats: {
    findAll: (...args: unknown[]) => mockMatchStatsSum(...args),
  },
}));

jest.mock("@modules/audit/AuditLog.model", () => ({
  __esModule: true,
  AuditLog: { create: jest.fn() },
}));

jest.mock("./playerStatEdit.model", () => ({
  __esModule: true,
  default: {
    bulkCreate: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));

import {
  getPlayerSeasonStats,
  getAllPlayerSeasonStats,
  upsertPlayerSeasonStats,
  recomputeFromMatches,
} from "./playerStats.service";

describe("getPlayerSeasonStats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns stats when found", async () => {
    const mockStats = {
      id: "abc",
      playerId: "p1",
      season: "2024/25",
      goals: 10,
    };
    mockFindOne.mockResolvedValue(mockStats);
    const result = await getPlayerSeasonStats("p1", "2024/25");
    expect(result).toEqual(mockStats);
    expect(mockFindOne).toHaveBeenCalledWith({
      where: { playerId: "p1", season: "2024/25" },
    });
  });

  it("throws 404 when not found", async () => {
    mockFindOne.mockResolvedValue(null);
    await expect(getPlayerSeasonStats("p1", "2024/25")).rejects.toThrow(
      new AppError("Season stats not found", 404),
    );
  });
});

describe("getAllPlayerSeasonStats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns all seasons for a player", async () => {
    const mockList = [{ season: "2024/25" }, { season: "2023/24" }];
    mockFindAll.mockResolvedValue(mockList);
    const result = await getAllPlayerSeasonStats("p1");
    expect(result).toEqual(mockList);
    expect(mockFindAll).toHaveBeenCalledWith({
      where: { playerId: "p1" },
      order: [["season", "DESC"]],
    });
  });
});

describe("upsertPlayerSeasonStats", () => {
  beforeEach(() => jest.clearAllMocks());

  it("upserts with source manual and returns record", async () => {
    const record = {
      id: "abc",
      playerId: "p1",
      season: "2024/25",
      goals: 5,
      source: "manual",
    };
    mockUpsert.mockResolvedValue([record, true]);
    const result = await upsertPlayerSeasonStats("p1", "2024/25", { goals: 5 });
    expect(result).toEqual(record);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "p1",
        season: "2024/25",
        goals: 5,
        source: "manual",
      }),
      expect.objectContaining({ returning: true }),
    );
  });
});

describe("recomputeFromMatches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("skips recompute when source is manual", async () => {
    mockFindOne.mockResolvedValue({ source: "manual" });
    await recomputeFromMatches("p1", "2024/25");
    expect(mockMatchStatsSum).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("aggregates match stats and upserts when source is computed", async () => {
    mockFindOne.mockResolvedValue({ source: "computed" });
    mockMatchStatsSum.mockResolvedValue([
      { goals: 3, assists: 1, minutesPlayed: 90, yellowCards: 1, redCards: 0 },
      { goals: 2, assists: 2, minutesPlayed: 80, yellowCards: 0, redCards: 0 },
    ]);
    mockUpsert.mockResolvedValue([{}, false]);
    await recomputeFromMatches("p1", "2024/25");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        goals: 5,
        assists: 3,
        matchesPlayed: 2,
        source: "computed",
      }),
    );
  });
});
