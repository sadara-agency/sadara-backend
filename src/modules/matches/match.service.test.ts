// ── Model mocks ──
jest.mock("@modules/matches/match.model");
jest.mock("@modules/matches/matchPlayer.model");
jest.mock("@modules/matches/playerMatchStats.model");
jest.mock("@modules/matches/matchAnalysis.model");
jest.mock("@modules/clubs/club.model");
jest.mock("@modules/squads/squad.model");
jest.mock("@modules/players/player.model");
jest.mock("@modules/users/user.model");
jest.mock("@shared/utils/displayId");
jest.mock("@modules/matches/matchAutoTasks");

import { Op } from "sequelize";
import { Match } from "@modules/matches/match.model";
import * as service from "./match.service";

beforeEach(() => {
  jest.clearAllMocks();
  (Match.findAndCountAll as jest.Mock).mockResolvedValue({
    rows: [],
    count: 0,
  });
  (Match.findAll as jest.Mock).mockResolvedValue([]);
});

function getWhere() {
  const call = (Match.findAndCountAll as jest.Mock).mock.calls[0][0];
  return call.where as Record<string | symbol, unknown>;
}

describe("listMatches providerSource filter", () => {
  it("filters by providerSource='saffplus'", async () => {
    await service.listMatches({ providerSource: "saffplus" });
    expect(getWhere().providerSource).toBe("saffplus");
  });

  it("filters by providerSource='saff'", async () => {
    await service.listMatches({ providerSource: "saff" });
    expect(getWhere().providerSource).toBe("saff");
  });

  it("treats 'manual' as IS NULL", async () => {
    await service.listMatches({ providerSource: "manual" });
    const ps = getWhere().providerSource as Record<symbol, unknown>;
    expect(ps).toEqual({ [Op.is]: null });
  });

  it("omits providerSource clause when not provided", async () => {
    await service.listMatches({});
    expect("providerSource" in getWhere()).toBe(false);
  });
});
