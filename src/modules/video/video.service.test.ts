// ── Model mocks ──
jest.mock("@modules/video/video.model", () => ({
  VideoClip: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  VideoTag: { findAll: jest.fn(), bulkCreate: jest.fn(), destroy: jest.fn() },
}));
jest.mock("@modules/players/player.model");
jest.mock("@modules/users/user.model");
jest.mock("@shared/utils/storage");

import { VideoClip, VideoTag } from "@modules/video/video.model";
import * as service from "./video.service";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getTagSummaryByPlayer", () => {
  it("aggregates tag counts across all clips for a player", async () => {
    (VideoClip.findAll as jest.Mock).mockResolvedValue([
      { id: "clip-1" },
      { id: "clip-2" },
    ]);
    (VideoTag.findAll as jest.Mock).mockResolvedValue([
      { tagType: "goal" },
      { tagType: "goal" },
      { tagType: "pressing" },
    ]);

    const result = await service.getTagSummaryByPlayer("player-1");

    expect(result).toEqual({ total: 3, byType: { goal: 2, pressing: 1 } });
  });

  it("returns empty summary when player has no clips", async () => {
    (VideoClip.findAll as jest.Mock).mockResolvedValue([]);

    const result = await service.getTagSummaryByPlayer("player-x");

    expect(result).toEqual({ total: 0, byType: {} });
    expect(VideoTag.findAll).not.toHaveBeenCalled();
  });
});
