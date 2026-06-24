jest.mock("@modules/permissions/permission.service", () => ({
  hasPermission: jest.fn(),
  getHiddenFields: jest.fn(),
}));
jest.mock("@modules/players/player.service", () => ({
  getPlayerById: jest.fn(),
  listPlayers: jest.fn(),
}));
jest.mock("@modules/playerStats/playerStats.service", () => ({
  getAllPlayerSeasonStats: jest.fn(),
}));
jest.mock("@modules/scouting/scoutReport.service", () => ({
  listScoutReports: jest.fn(),
  getScoutReport: jest.fn(),
}));
jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import type { AuthUser } from "@shared/types";
import {
  hasPermission,
  getHiddenFields,
} from "@modules/permissions/permission.service";
import { getPlayerById } from "@modules/players/player.service";
import { executeTool } from "./tools/registry";

const mockHasPermission = hasPermission as jest.Mock;
const mockGetHiddenFields = getHiddenFields as jest.Mock;
const mockGetPlayerById = getPlayerById as jest.Mock;

const USER: AuthUser = {
  id: "user-1",
  email: "scout@sadara.com",
  fullName: "Test Scout",
  role: "Scout",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("executeTool — RBAC enforcement", () => {
  it("returns an error tool_result (not a throw) when permission is denied", async () => {
    mockHasPermission.mockResolvedValue(false);

    const result = await executeTool(
      "call-1",
      "get_player_by_id",
      { id: "P-26-0001" },
      USER,
    );

    expect(result.isError).toBe(true);
    expect(result.toolUseId).toBe("call-1");
    expect(result.content).toMatch(/permission/i);
    expect(mockGetPlayerById).not.toHaveBeenCalled();
  });

  it("calls the service and strips hidden fields when permitted", async () => {
    mockHasPermission.mockResolvedValue(true);
    mockGetHiddenFields.mockResolvedValue(["salary"]);
    mockGetPlayerById.mockResolvedValue({
      id: "p1",
      fullName: "Player One",
      salary: 999,
    });

    const result = await executeTool(
      "call-2",
      "get_player_by_id",
      { id: "p1" },
      USER,
    );

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content) as Record<string, unknown>;
    expect(payload.fullName).toBe("Player One");
    expect(payload).not.toHaveProperty("salary");
  });

  it("returns an error result for invalid arguments without throwing", async () => {
    const result = await executeTool("call-3", "get_player_by_id", {}, USER);

    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/invalid arguments/i);
    expect(mockHasPermission).not.toHaveBeenCalled();
  });

  it("returns an error result for an unknown tool", async () => {
    const result = await executeTool("call-4", "delete_everything", {}, USER);

    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/unknown tool/i);
  });
});
