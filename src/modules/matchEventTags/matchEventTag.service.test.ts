// ── Model mocks ──
jest.mock("./matchEventTag.model", () => ({
  MatchEventTag: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock("@modules/matches/match.model", () => ({
  Match: { findByPk: jest.fn() },
}));
jest.mock("@modules/players/player.model", () => ({ Player: {} }));

import { MatchEventTag } from "./matchEventTag.model";
import { Match } from "@modules/matches/match.model";
import * as service from "./matchEventTag.service";

beforeEach(() => {
  jest.clearAllMocks();
  // Default: match exists.
  (Match.findByPk as jest.Mock).mockResolvedValue({ id: "m1" });
});

describe("getSummaryForMatch", () => {
  it("groups tags by player then by tag type", async () => {
    (MatchEventTag.findAll as jest.Mock).mockResolvedValue([
      { playerId: "p1", tagType: "goal" },
      { playerId: "p1", tagType: "goal" },
      { playerId: "p2", tagType: "save" },
    ]);

    const result = await service.getSummaryForMatch("m1");

    expect(result.matchId).toBe("m1");
    expect(result.total).toBe(3);
    expect(result.players).toEqual(
      expect.arrayContaining([
        { playerId: "p1", total: 2, byType: { goal: 2 } },
        { playerId: "p2", total: 1, byType: { save: 1 } },
      ]),
    );
  });

  it("returns an empty summary for a match with no tags", async () => {
    (MatchEventTag.findAll as jest.Mock).mockResolvedValue([]);

    const result = await service.getSummaryForMatch("m1");

    expect(result).toEqual({ matchId: "m1", total: 0, players: [] });
  });

  it("throws 404 when the match does not exist", async () => {
    (Match.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(service.getSummaryForMatch("missing")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("createTag", () => {
  it("merges matchId and createdBy into the created row", async () => {
    (MatchEventTag.create as jest.Mock).mockImplementation(async (v) => v);

    await service.createTag(
      "m1",
      { playerId: "p1", tagType: "goal", timestampSec: 120 },
      "user-1",
    );

    expect(MatchEventTag.create).toHaveBeenCalledWith({
      playerId: "p1",
      tagType: "goal",
      timestampSec: 120,
      matchId: "m1",
      createdBy: "user-1",
    });
  });
});

describe("listTagsForMatch", () => {
  it("filters by playerId when provided", async () => {
    (MatchEventTag.findAll as jest.Mock).mockResolvedValue([]);

    await service.listTagsForMatch("m1", { playerId: "p1" });

    expect(MatchEventTag.findAll).toHaveBeenCalledWith({
      where: { matchId: "m1", playerId: "p1" },
      order: [["timestampSec", "ASC"]],
    });
  });

  it("does not filter by player when no playerId is given", async () => {
    (MatchEventTag.findAll as jest.Mock).mockResolvedValue([]);

    await service.listTagsForMatch("m1", {});

    expect(MatchEventTag.findAll).toHaveBeenCalledWith({
      where: { matchId: "m1" },
      order: [["timestampSec", "ASC"]],
    });
  });
});

describe("deleteTag", () => {
  it("throws 404 when the tag does not exist", async () => {
    (MatchEventTag.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(service.deleteTag("missing")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("destroys the tag and returns its id", async () => {
    const destroy = jest.fn();
    (MatchEventTag.findByPk as jest.Mock).mockResolvedValue({ destroy });

    const result = await service.deleteTag("tag-1");

    expect(destroy).toHaveBeenCalled();
    expect(result).toEqual({ id: "tag-1" });
  });
});
