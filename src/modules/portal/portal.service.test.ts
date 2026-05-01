jest.mock("@config/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@config/database", () => ({
  sequelize: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock("@modules/users/user.model", () => ({
  User: { findByPk: jest.fn(), findOne: jest.fn() },
}));

jest.mock("@modules/players/player.model", () => ({
  Player: { findByPk: jest.fn(), findOne: jest.fn() },
}));

jest.mock("@modules/portal/playerAccount.model", () => ({
  PlayerAccount: { findByPk: jest.fn(), findOne: jest.fn(), update: jest.fn() },
}));

jest.mock("@modules/notifications/notification.service", () => ({
  notifyByRole: jest.fn().mockResolvedValue(3),
  notifyUser: jest.fn().mockResolvedValue({ id: "notif-1" }),
}));

jest.mock("@shared/utils/cache", () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn().mockResolvedValue(true),
  CacheTTL: { SHORT: 60, MEDIUM: 300, LONG: 900, HOUR: 3600, DAY: 86400 },
  CachePrefix: { PORTAL: "portal" },
}));

jest.mock("@shared/utils/encryption", () => ({
  isEncrypted: jest.fn().mockReturnValue(false),
  decrypt: jest.fn((s: string) => s),
}));

jest.mock("@shared/utils/pdf", () => ({
  enqueueContractPdfRegen: jest.fn(),
}));

jest.mock("@modules/contracts/contract.model", () => ({
  Contract: { findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
}));
jest.mock("@modules/clubs/club.model", () => ({ Club: {} }));
jest.mock("@modules/matches/match.model", () => ({
  Match: { findAll: jest.fn() },
}));
jest.mock("@modules/sessions/session.model", () => ({
  Session: { findAll: jest.fn() },
}));
jest.mock("@modules/documents/document.model", () => ({
  Document: { findAll: jest.fn() },
}));
jest.mock("@modules/gates/gate.model", () => ({
  Gate: { findAll: jest.fn() },
  GateChecklist: {},
}));
jest.mock("@modules/tasks/task.model", () => ({
  Task: { findAll: jest.fn() },
}));
jest.mock("@modules/injuries/injury.model", () => ({
  Injury: { findAll: jest.fn() },
  InjuryUpdate: {},
}));
jest.mock("@modules/wellness/fitness.model", () => ({
  WellnessExercise: { name: "WellnessExercise" },
  FitnessTest: { name: "FitnessTest" },
}));
jest.mock("@modules/wellness/developmentProgram.model", () => ({
  DevelopmentProgram: { findAll: jest.fn(), name: "DevelopmentProgram" },
  ProgramExercise: { name: "ProgramExercise" },
}));
jest.mock("@modules/wellness/trainingBlock.model", () => ({
  TrainingBlock: { findAll: jest.fn(), name: "TrainingBlock" },
  TrainingBlockExercise: { name: "TrainingBlockExercise" },
}));

import { requestProfileLink, getMySessions } from "./portal.service";
import { User } from "@modules/users/user.model";
import { Player } from "@modules/players/player.model";
import { Session } from "@modules/sessions/session.model";
import {
  notifyByRole,
  notifyUser,
} from "@modules/notifications/notification.service";
import { cacheGet, cacheSet } from "@shared/utils/cache";

describe("requestProfileLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cacheGet as jest.Mock).mockResolvedValue(null);
  });

  it("notifies the agent when the player row has an agentId", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "p@example.com",
      fullName: "Player One",
      role: "Player",
      playerId: null,
    });
    (Player.findOne as jest.Mock).mockResolvedValue({
      id: "p-1",
      agentId: "agent-1",
      firstName: "Player",
      lastName: "One",
    });

    const result = await requestProfileLink("user-1");

    expect(notifyUser).toHaveBeenCalledWith(
      "agent-1",
      expect.objectContaining({
        type: "system",
        sourceType: "portal-link-request",
        priority: "high",
      }),
    );
    expect(notifyByRole).not.toHaveBeenCalled();
    expect(result.target).toBe("agent");
    expect(result.notified).toBe(1);
    expect(cacheSet).toHaveBeenCalledWith(
      "portal:link-request:user-1",
      expect.objectContaining({ at: expect.any(String) }),
      24 * 60 * 60,
    );
  });

  it("falls back to Admin/Manager when no matching player row exists", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-2",
      email: "noplayer@example.com",
      fullName: "Floating User",
      role: "Player",
      playerId: null,
    });
    (Player.findOne as jest.Mock).mockResolvedValue(null);

    const result = await requestProfileLink("user-2");

    expect(notifyUser).not.toHaveBeenCalled();
    expect(notifyByRole).toHaveBeenCalledWith(
      ["Admin", "Manager"],
      expect.objectContaining({
        type: "system",
        sourceType: "portal-link-request",
      }),
    );
    expect(result.target).toBe("admins");
    expect(result.notified).toBe(3);
  });

  it("falls back to Admin/Manager when the matching player has no agent", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-3",
      email: "p3@example.com",
      fullName: "Player Three",
      role: "Player",
      playerId: null,
    });
    (Player.findOne as jest.Mock).mockResolvedValue({
      id: "p-3",
      agentId: null,
      firstName: "Player",
      lastName: "Three",
    });

    const result = await requestProfileLink("user-3");

    expect(notifyUser).not.toHaveBeenCalled();
    expect(notifyByRole).toHaveBeenCalled();
    expect(result.target).toBe("admins");
  });

  it("rejects if the user is already linked", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-4",
      email: "linked@example.com",
      role: "Player",
      playerId: "p-99",
    });

    await expect(requestProfileLink("user-4")).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(notifyUser).not.toHaveBeenCalled();
    expect(notifyByRole).not.toHaveBeenCalled();
  });

  it("rejects non-Player roles", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-5",
      email: "admin@example.com",
      role: "Admin",
      playerId: null,
    });

    await expect(requestProfileLink("user-5")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("rejects (429) when the cooldown is still active", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-6",
      email: "p6@example.com",
      role: "Player",
      playerId: null,
    });
    (cacheGet as jest.Mock).mockResolvedValue({
      at: new Date().toISOString(),
    });

    await expect(requestProfileLink("user-6")).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(notifyUser).not.toHaveBeenCalled();
    expect(notifyByRole).not.toHaveBeenCalled();
  });
});

describe("getMySessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("splits sessions into upcoming (Scheduled + future) and past (everything else)", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-s1",
      email: "p@example.com",
      role: "Player",
      playerId: "p-s1",
    });
    (Player.findByPk as jest.Mock).mockResolvedValue({
      id: "p-s1",
      getDataValue: (k: string) => (k === "id" ? "p-s1" : undefined),
    });

    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    (Session.findAll as jest.Mock).mockResolvedValue([
      { id: "s1", sessionDate: future, completionStatus: "Scheduled" },
      { id: "s2", sessionDate: past, completionStatus: "Completed" },
      { id: "s3", sessionDate: past, completionStatus: "Cancelled" },
      { id: "s4", sessionDate: past, completionStatus: "Scheduled" },
    ]);

    const result = await getMySessions("user-s1");

    expect(result.total).toBe(4);
    expect(result.upcoming.map((s: any) => s.id)).toEqual(["s1"]);
    expect(result.past.map((s: any) => s.id).sort()).toEqual([
      "s2",
      "s3",
      "s4",
    ]);
  });

  it("returns empty arrays when player has no sessions", async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      id: "user-s2",
      email: "p2@example.com",
      role: "Player",
      playerId: "p-s2",
    });
    (Player.findByPk as jest.Mock).mockResolvedValue({
      id: "p-s2",
      getDataValue: (k: string) => (k === "id" ? "p-s2" : undefined),
    });
    (Session.findAll as jest.Mock).mockResolvedValue([]);

    const result = await getMySessions("user-s2");

    expect(result).toEqual({ upcoming: [], past: [], total: 0 });
  });
});
