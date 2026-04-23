/// <reference types="jest" />
import { UniqueConstraintError } from "sequelize";

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockUserFindByPk = jest.fn();

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

jest.mock("../../../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import * as service from "../../../src/modules/player-coach-assignments/playerCoachAssignment.service";

describe("PlayerCoachAssignment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAssignment", () => {
    const payload = {
      playerId: "00000000-0000-0000-0000-000000000001",
      coachUserId: "00000000-0000-0000-0000-000000000002",
      specialty: "GymCoach" as const,
    };

    it("creates an assignment when player and staff user exist", async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: payload.playerId });
      mockUserFindByPk.mockResolvedValue({
        id: payload.coachUserId,
        role: "GymCoach",
      });
      const created = { id: "new-id", ...payload };
      mockCreate.mockResolvedValue(created);

      const result = await service.createAssignment(payload, "admin-id");

      expect(mockCreate).toHaveBeenCalledWith(payload);
      expect(result).toEqual(created);
    });

    it("creates an assignment for non-coach staff roles (Analyst, Scout, etc.)", async () => {
      mockPlayerFindByPk.mockResolvedValue({ id: payload.playerId });
      mockUserFindByPk.mockResolvedValue({
        id: payload.coachUserId,
        role: "Analyst",
      });
      const analystPayload = { ...payload, specialty: "Analyst" as const };
      const created = { id: "new-id", ...analystPayload };
      mockCreate.mockResolvedValue(created);

      const result = await service.createAssignment(analystPayload, "admin-id");

      expect(mockCreate).toHaveBeenCalledWith(analystPayload);
      expect(result).toEqual(created);
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
