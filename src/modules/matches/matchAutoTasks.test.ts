jest.mock("@modules/audit/AuditLog.model", () => ({
  AuditLog: {
    init: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    name: "AuditLog",
  },
}));
jest.mock("@shared/utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@modules/tasks/task.model", () => ({
  Task: {
    init: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    name: "Task",
  },
}));
jest.mock("@modules/matches/matchPlayer.model", () => ({
  MatchPlayer: {
    init: jest.fn(),
    findAll: jest.fn(),
    name: "MatchPlayer",
  },
}));
jest.mock("@modules/matches/playerMatchStats.model", () => ({
  PlayerMatchStats: {
    init: jest.fn(),
    findAll: jest.fn(),
    name: "PlayerMatchStats",
  },
}));
jest.mock("@modules/players/player.model", () => ({
  Player: {
    init: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    name: "Player",
  },
}));
jest.mock("@modules/matches/match.model", () => ({
  Match: {
    init: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    name: "Match",
  },
}));
jest.mock("@modules/clubs/club.model", () => ({
  Club: {
    init: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    name: "Club",
  },
}));
jest.mock("@modules/users/user.model", () => ({
  User: {
    init: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    name: "User",
  },
}));
jest.mock("@modules/notifications/notification.model", () => ({
  Notification: {
    init: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    name: "Notification",
  },
}));
jest.mock("@modules/permissions/permission.model", () => ({
  RolePermission: { init: jest.fn(), name: "RolePermission" },
  RoleFieldPermission: { init: jest.fn(), name: "RoleFieldPermission" },
}));
jest.mock("@modules/permissions/permission.service", () => ({
  hasPermission: jest.fn().mockResolvedValue(true),
  getFieldPermissions: jest.fn().mockResolvedValue([]),
}));
jest.mock("@middleware/auth", () => ({
  authenticate: jest.fn(),
  authorizeModule: jest.fn(),
  authorize: jest.fn(),
}));
jest.mock("@modules/notifications/notification.sse", () => ({
  sseClients: new Map(),
  sendSSE: jest.fn(),
}));
jest.mock("@modules/notifications/notification.service");
jest.mock("@shared/utils/autoTaskHelpers", () => ({
  createAutoTaskIfNotExists: jest.fn(),
  findUserByRole: jest.fn(),
}));
jest.mock("@config/database", () => ({
  sequelize: { query: jest.fn().mockResolvedValue([[], {}]) },
}));

import { Task } from "@modules/tasks/task.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { Match } from "@modules/matches/match.model";
import { User } from "@modules/users/user.model";
import { generateMatchLevelPreTasks } from "./matchAutoTasks";

const matchId = "match-1";

beforeEach(() => {
  jest.clearAllMocks();
  (Match.findByPk as jest.Mock).mockResolvedValue({
    matchDate: new Date("2030-01-01T18:00:00Z"),
    homeClub: { name: "Home FC", nameAr: "هوم" },
    awayClub: { name: "Away FC", nameAr: "اوي" },
  });
  (Task.findOne as jest.Mock).mockResolvedValue(null);
  (Task.create as jest.Mock).mockResolvedValue({ id: "task-1" });
  // Fallback first-active-user lookup
  (User.findOne as jest.Mock).mockResolvedValue({ id: "fallback-user" });
});

function tasksAssignedFor(role: string): string | null {
  // Inspect the corresponding Task.create call — the targetRole isn't on the
  // task itself, so we map by call order to the rule list:
  //   0 → pre_scout_opponent_report (Scout)
  //   1 → pre_analyst_match_analysis (Analyst)
  //   2 → pre_analyst_postmatch_template (Analyst)
  const calls = (Task.create as jest.Mock).mock.calls;
  const idx = role === "Scout" ? 0 : 1;
  return calls[idx]?.[0]?.assignedTo ?? null;
}

describe("generateMatchLevelPreTasks — analyst routing", () => {
  it("assigns the sole analyst when all assigned players share one analystId", async () => {
    (MatchPlayer.findAll as jest.Mock).mockResolvedValue([
      { player: { analystId: "analyst-A" } },
      { player: { analystId: "analyst-A" } },
      { player: { analystId: "analyst-A" } },
    ]);

    await generateMatchLevelPreTasks(matchId, 0);

    expect(tasksAssignedFor("Analyst")).toBe("analyst-A");
  });

  it("assigns the majority analyst when players have multiple analysts", async () => {
    (MatchPlayer.findAll as jest.Mock).mockResolvedValue([
      { player: { analystId: "analyst-A" } },
      { player: { analystId: "analyst-A" } },
      { player: { analystId: "analyst-B" } },
    ]);

    await generateMatchLevelPreTasks(matchId, 0);

    expect(tasksAssignedFor("Analyst")).toBe("analyst-A");
  });

  it("falls back to first active user when no player has an analystId", async () => {
    (MatchPlayer.findAll as jest.Mock).mockResolvedValue([
      { player: { analystId: null } },
      { player: { analystId: null } },
    ]);

    await generateMatchLevelPreTasks(matchId, 0);

    expect(tasksAssignedFor("Analyst")).toBe("fallback-user");
  });

  it("Scout rule is unaffected and still uses fallback first-active lookup", async () => {
    (MatchPlayer.findAll as jest.Mock).mockResolvedValue([
      { player: { analystId: "analyst-A" } },
    ]);

    await generateMatchLevelPreTasks(matchId, 0);

    // Scout rule (call index 0) goes through the legacy path → fallback user.
    expect(tasksAssignedFor("Scout")).toBe("fallback-user");
  });
});
