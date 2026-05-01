/// <reference types="jest" />
import { UniqueConstraintError } from "sequelize";

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockUserFindByPk = jest.fn();
const mockTaskFindAll = jest.fn();
const mockCreateNotification = jest.fn();
const mockNotifyByRole = jest.fn();
const mockCreateTask = jest.fn();

jest.mock("../../../src/config/database", () => ({
  sequelize: {
    query: jest.fn(),
    authenticate: jest.fn(),
    transaction: jest.fn(async (cb: any) =>
      cb({ commit: jest.fn(), rollback: jest.fn() }),
    ),
    QueryTypes: { SELECT: "SELECT" },
  },
}));

jest.mock(
  "../../../src/modules/player-coach-assignments/playerCoachAssignment.model",
  () => ({
    __esModule: true,
    default: {
      findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
      findByPk: (...a: unknown[]) => mockFindByPk(...a),
      create: (...a: unknown[]) => mockCreate(...a),
    },
  }),
);

jest.mock("../../../src/modules/players/player.model", () => ({
  Player: {
    findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a),
    name: "Player",
  },
}));

jest.mock("../../../src/modules/users/user.model", () => ({
  User: {
    findByPk: (...a: unknown[]) => mockUserFindByPk(...a),
    name: "User",
  },
}));

jest.mock("../../../src/modules/tasks/task.model", () => ({
  Task: {
    findAll: (...a: unknown[]) => mockTaskFindAll(...a),
    name: "Task",
  },
}));

jest.mock("../../../src/modules/notifications/notification.service", () => ({
  createNotification: (...a: unknown[]) => mockCreateNotification(...a),
  notifyByRole: (...a: unknown[]) => mockNotifyByRole(...a),
}));

jest.mock("../../../src/modules/tasks/task.service", () => ({
  createTask: (...a: unknown[]) => mockCreateTask(...a),
}));

jest.mock("../../../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("../../../src/modules/calendar/calendarScope", () => ({
  upsertSourceAttendees: jest.fn(),
  evictCalendarScope: jest.fn().mockResolvedValue(undefined),
}));

import * as service from "../../../src/modules/player-coach-assignments/playerCoachAssignment.service";

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

describe("PlayerCoachAssignment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNotification.mockResolvedValue(null);
    mockCreateTask.mockResolvedValue(null);
    mockNotifyByRole.mockResolvedValue(0);
  });

  describe("createAssignment", () => {
    const payload = {
      playerId: "00000000-0000-0000-0000-000000000001",
      coachUserId: "00000000-0000-0000-0000-000000000002",
      specialty: "GymCoach" as const,
    };

    it("creates an assignment when player and staff user exist", async () => {
      mockPlayerFindByPk.mockResolvedValue({
        id: payload.playerId,
        firstName: "Test",
        lastName: "Player",
      });
      mockUserFindByPk.mockResolvedValue({
        id: payload.coachUserId,
        role: "GymCoach",
      });
      const created = {
        id: "new-id",
        ...payload,
        priority: "normal",
        dueAt: null,
      };
      mockCreate.mockResolvedValue(created);

      const result = await service.createAssignment(payload, "admin-id");

      // Service now adds default lifecycle fields when persisting.
      expect(mockCreate).toHaveBeenCalledWith({
        playerId: payload.playerId,
        coachUserId: payload.coachUserId,
        specialty: payload.specialty,
        priority: "normal",
        dueAt: null,
        notes: null,
      });
      expect(result).toEqual(created);
    });

    it("creates an assignment for non-coach staff roles (Analyst, Scout, etc.)", async () => {
      mockPlayerFindByPk.mockResolvedValue({
        id: payload.playerId,
        firstName: "Test",
        lastName: "Player",
      });
      mockUserFindByPk.mockResolvedValue({
        id: payload.coachUserId,
        role: "Analyst",
      });
      const analystPayload = { ...payload, specialty: "Analyst" as const };
      const created = { id: "new-id", ...analystPayload };
      mockCreate.mockResolvedValue(created);

      const result = await service.createAssignment(analystPayload, "admin-id");

      expect(mockCreate).toHaveBeenCalledWith({
        playerId: analystPayload.playerId,
        coachUserId: analystPayload.coachUserId,
        specialty: analystPayload.specialty,
        priority: "normal",
        dueAt: null,
        notes: null,
      });
      expect(result).toEqual(created);
    });

    it("fans out a notification and an auto-task to the assignee after create", async () => {
      mockPlayerFindByPk.mockResolvedValue({
        id: payload.playerId,
        firstName: "Test",
        lastName: "Player",
      });
      mockUserFindByPk.mockResolvedValueOnce({
        id: payload.coachUserId,
        role: "GymCoach",
      });
      // creator lookup
      mockUserFindByPk.mockResolvedValueOnce({
        id: "admin-id",
        fullName: "Admin",
      });
      const created = {
        id: "new-id",
        ...payload,
        priority: "normal",
        dueAt: null,
      };
      mockCreate.mockResolvedValue(created);

      await service.createAssignment(payload, "admin-id");
      // Fan-out is fire-and-forget — let microtasks settle.
      await flushPromises();

      expect(mockCreateNotification).toHaveBeenCalledTimes(1);
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: payload.coachUserId,
          type: "task",
          sourceType: "assignments",
          sourceId: "new-id",
        }),
      );
      expect(mockCreateTask).toHaveBeenCalledTimes(1);
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedTo: payload.coachUserId,
          playerId: payload.playerId,
          assignmentId: "new-id",
          isAutoCreated: true,
        }),
        "admin-id",
      );
    });

    it("throws 404 when player does not exist", async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      mockUserFindByPk.mockResolvedValue({
        id: payload.coachUserId,
        role: "GymCoach",
      });

      await expect(
        service.createAssignment(payload, "admin-id"),
      ).rejects.toMatchObject({ statusCode: 404, message: "Player not found" });
    });

    it("throws 404 when staff user does not exist", async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: payload.playerId });
      mockUserFindByPk.mockResolvedValue(null);

      await expect(
        service.createAssignment(payload, "admin-id"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Staff user not found",
      });
    });

    it("throws 422 when target user has the Player role", async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: payload.playerId });
      mockUserFindByPk.mockResolvedValue({
        id: payload.coachUserId,
        role: "Player",
      });

      await expect(
        service.createAssignment(payload, "admin-id"),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it("throws 409 on duplicate (player, coach) combination", async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: payload.playerId });
      mockUserFindByPk.mockResolvedValue({
        id: payload.coachUserId,
        role: "GymCoach",
      });
      const uniqueErr = Object.create(UniqueConstraintError.prototype);
      mockCreate.mockRejectedValue(uniqueErr);

      await expect(
        service.createAssignment(payload, "admin-id"),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("updateAssignmentStatus", () => {
    const baseUser = {
      id: "user-1",
      fullName: "User One",
      role: "Coach",
    } as any;

    it("transitions Assigned → Acknowledged and stamps acknowledgedAt", async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const assignment = {
        id: "a1",
        coachUserId: "user-1",
        playerId: "p1",
        status: "Assigned",
        acknowledgedAt: null,
        completedAt: null,
        update,
      };
      mockFindByPk.mockResolvedValue(assignment);

      await service.updateAssignmentStatus(
        "a1",
        { status: "Acknowledged" },
        baseUser,
      );

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Acknowledged",
          acknowledgedAt: expect.any(Date),
        }),
      );
    });

    it("rejects an illegal transition (Completed → Acknowledged) with 422", async () => {
      mockFindByPk.mockResolvedValue({
        id: "a1",
        coachUserId: "user-1",
        playerId: "p1",
        status: "Completed",
        update: jest.fn(),
      });

      await expect(
        service.updateAssignmentStatus(
          "a1",
          { status: "Acknowledged" },
          baseUser,
        ),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it("rejects a non-assignee non-leader with 403", async () => {
      mockFindByPk.mockResolvedValue({
        id: "a1",
        coachUserId: "someone-else",
        playerId: "p1",
        status: "Assigned",
        update: jest.fn(),
      });

      await expect(
        service.updateAssignmentStatus(
          "a1",
          { status: "Acknowledged" },
          baseUser,
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("allows Admin to acknowledge on behalf of the assignee", async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      mockFindByPk.mockResolvedValue({
        id: "a1",
        coachUserId: "someone-else",
        playerId: "p1",
        status: "Assigned",
        acknowledgedAt: null,
        completedAt: null,
        update,
      });

      const adminUser = { ...baseUser, id: "admin", role: "Admin" } as any;
      await service.updateAssignmentStatus(
        "a1",
        { status: "Acknowledged" },
        adminUser,
      );

      expect(update).toHaveBeenCalled();
    });
  });

  describe("listMyAssignments", () => {
    const userId = "user-1";

    function rowFor(overrides: Partial<any> = {}) {
      const data = {
        id: overrides.id ?? "a1",
        playerId: "p1",
        coachUserId: userId,
        specialty: "Coach",
        status: "Assigned",
        priority: "normal",
        dueAt: null,
        acknowledgedAt: null,
        completedAt: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        player: null,
        ...overrides,
      };
      return { id: data.id, get: ({ plain: _ }: any) => data };
    }

    it("filters by a single status value (string form)", async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockTaskFindAll.mockResolvedValue([]);

      await service.listMyAssignments(userId, {
        page: 1,
        limit: 50,
        sort: "created_at",
        order: "desc",
        status: ["Assigned"],
        groupBy: "none",
      } as any);

      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where).toMatchObject({
        coachUserId: userId,
        status: "Assigned",
      });
    });

    it("filters by multiple statuses using Op.in", async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockTaskFindAll.mockResolvedValue([]);

      await service.listMyAssignments(userId, {
        page: 1,
        limit: 50,
        sort: "created_at",
        order: "desc",
        status: ["Assigned", "InProgress"],
        groupBy: "none",
      } as any);

      const call = mockFindAndCountAll.mock.calls[0][0];
      // status becomes an Op.in symbol-keyed object — we just assert it isn't a string.
      expect(typeof call.where.status).toBe("object");
    });

    it("attaches an iLike OR clause when search is provided", async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockTaskFindAll.mockResolvedValue([]);

      await service.listMyAssignments(userId, {
        page: 1,
        limit: 50,
        sort: "created_at",
        order: "desc",
        search: "ahmed",
        groupBy: "none",
      } as any);

      const call = mockFindAndCountAll.mock.calls[0][0];
      const playerInclude = call.include[0];
      expect(playerInclude.required).toBe(true);
      expect(playerInclude.where).toBeDefined();
    });

    it("groups page results by status when groupBy=status", async () => {
      const r1 = rowFor({ id: "a1", status: "Assigned" });
      const r2 = rowFor({ id: "a2", status: "InProgress" });
      const r3 = rowFor({ id: "a3", status: "Assigned" });
      mockFindAndCountAll.mockResolvedValue({ count: 3, rows: [r1, r2, r3] });
      mockTaskFindAll.mockResolvedValue([]);

      const result = await service.listMyAssignments(userId, {
        page: 1,
        limit: 50,
        sort: "created_at",
        order: "desc",
        groupBy: "status",
      } as any);

      expect(result.groups).toBeDefined();
      expect(result.groups!.Assigned).toHaveLength(2);
      expect(result.groups!.InProgress).toHaveLength(1);
    });

    it("returns no groups field when groupBy=none", async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockTaskFindAll.mockResolvedValue([]);

      const result = await service.listMyAssignments(userId, {
        page: 1,
        limit: 50,
        sort: "created_at",
        order: "desc",
        groupBy: "none",
      } as any);

      expect(result.groups).toBeUndefined();
    });

    it("returns empty data + zero meta when user has no assignments", async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      mockTaskFindAll.mockResolvedValue([]);

      const result = await service.listMyAssignments(userId, {
        page: 1,
        limit: 50,
        sort: "created_at",
        order: "desc",
        groupBy: "none",
      } as any);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("deleteAssignment", () => {
    it("throws 404 when assignment does not exist", async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(service.deleteAssignment("missing-id")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("calls destroy and returns { id } on success", async () => {
      const destroy = jest.fn();
      mockFindByPk.mockResolvedValue({ id: "a1", destroy });

      const result = await service.deleteAssignment("a1");

      expect(destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: "a1" });
    });
  });
});
