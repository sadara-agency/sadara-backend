jest.mock(
  "@modules/player-coach-assignments/playerCoachAssignment.model",
  () => ({
    PlayerCoachAssignment: {
      findAll: jest.fn(),
    },
  }),
);

jest.mock("@shared/utils/cache", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(true),
  cacheDel: jest.fn().mockResolvedValue(true),
  CacheTTL: { SHORT: 60 },
  CachePrefix: { CALENDAR_SCOPE: "calendar-scope" },
}));

jest.mock("@config/logger", () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { buildCalendarScope, evictCalendarScope } from "./calendarScope";
import { PlayerCoachAssignment } from "@modules/player-coach-assignments/playerCoachAssignment.model";
import { cacheGet, cacheSet, cacheDel } from "@shared/utils/cache";
import type { UserRole } from "@shared/types";

const mockFindAll = PlayerCoachAssignment.findAll as jest.Mock;
const mockCacheGet = cacheGet as jest.Mock;
const mockCacheSet = cacheSet as jest.Mock;
const mockCacheDel = cacheDel as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheGet.mockResolvedValue(null);
});

describe("buildCalendarScope", () => {
  it("marks Admin as privileged with empty assignedPlayerIds", async () => {
    const scope = await buildCalendarScope("user-1", ["Admin"]);
    expect(scope.isPrivileged).toBe(true);
    expect(scope.assignedPlayerIds).toEqual([]);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("marks Manager as privileged", async () => {
    const scope = await buildCalendarScope("user-2", ["Manager"]);
    expect(scope.isPrivileged).toBe(true);
  });

  it("marks Executive as privileged", async () => {
    const scope = await buildCalendarScope("user-3", ["Executive"]);
    expect(scope.isPrivileged).toBe(true);
  });

  it("fetches assigned players for Coach role", async () => {
    mockFindAll.mockResolvedValueOnce([
      { playerId: "player-a" },
      { playerId: "player-b" },
    ]);
    const scope = await buildCalendarScope("coach-1", ["Coach"]);
    expect(scope.isPrivileged).toBe(false);
    expect(scope.assignedPlayerIds).toEqual(["player-a", "player-b"]);
    expect(mockFindAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          coachUserId: "coach-1",
          status: ["Assigned", "Acknowledged", "InProgress"],
        },
      }),
    );
  });

  it("Scout gets empty assignedPlayerIds (no player assignments)", async () => {
    mockFindAll.mockResolvedValueOnce([]);
    const scope = await buildCalendarScope("scout-1", ["Scout"]);
    expect(scope.isPrivileged).toBe(false);
    expect(scope.assignedPlayerIds).toEqual([]);
  });

  it("Player role skips assignment lookup and sets linkedPlayerId", async () => {
    const scope = await buildCalendarScope(
      "user-player-1",
      ["Player"],
      "player-uuid-99",
    );
    expect(scope.isPrivileged).toBe(false);
    expect(scope.linkedPlayerId).toBe("player-uuid-99");
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("returns cached scope without hitting DB", async () => {
    const cached = {
      userId: "user-4",
      roles: ["Coach"] as UserRole[],
      isPrivileged: false,
      assignedPlayerIds: ["cached-player"],
      linkedPlayerId: null,
    };
    mockCacheGet.mockResolvedValueOnce(cached);
    const scope = await buildCalendarScope("user-4", ["Coach"]);
    expect(scope).toEqual(cached);
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("writes computed scope to cache", async () => {
    mockFindAll.mockResolvedValueOnce([{ playerId: "p1" }]);
    await buildCalendarScope("coach-2", ["Coach"]);
    expect(mockCacheSet).toHaveBeenCalledWith(
      "calendar-scope:coach-2",
      expect.objectContaining({ userId: "coach-2" }),
      60,
    );
  });

  it("swallows DB error and returns scope with empty assignedPlayerIds", async () => {
    mockFindAll.mockRejectedValueOnce(new Error("DB down"));
    const scope = await buildCalendarScope("coach-3", ["Coach"]);
    expect(scope.assignedPlayerIds).toEqual([]);
  });
});

describe("evictCalendarScope", () => {
  it("calls cacheDel with the correct key", async () => {
    await evictCalendarScope("user-xyz");
    expect(mockCacheDel).toHaveBeenCalledWith("calendar-scope:user-xyz");
  });
});
