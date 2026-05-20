// Unit tests for recoveryActivity.service. Sequelize model + shared utils mocked.

jest.mock("./recoveryActivity.model", () => ({
  __esModule: true,
  default: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@middleware/errorHandler", () => ({
  AppError: class AppError extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.status = status;
    }
  },
}));

jest.mock("@shared/utils/rowScope", () => ({
  buildRowScope: jest.fn(async () => null),
  mergeScope: jest.fn(),
  checkRowAccess: jest.fn(async () => true),
}));

jest.mock("@shared/utils/pagination", () => ({
  buildMeta: jest.fn(() => ({ page: 1, limit: 20, total: 0, totalPages: 0 })),
}));

jest.mock("@shared/utils/cache", () => ({
  invalidateMultiple: jest.fn(async () => {}),
  CachePrefix: { WELLNESS: "wellness", DASHBOARD: "dash" },
}));

import RecoveryActivity from "./recoveryActivity.model";
import {
  createRecoveryActivity,
  getRecoveryActivityById,
  deleteRecoveryActivity,
  getTodayRecoveryForPlayer,
} from "./recoveryActivity.service";
import { checkRowAccess } from "@shared/utils/rowScope";

const PLAYER_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  jest.clearAllMocks();
  (checkRowAccess as jest.Mock).mockResolvedValue(true);
});

describe("createRecoveryActivity", () => {
  it("creates a record when no same-date row exists", async () => {
    (RecoveryActivity.findOne as jest.Mock).mockResolvedValue(null);
    (RecoveryActivity.create as jest.Mock).mockResolvedValue({
      id: "r1",
      playerId: PLAYER_ID,
    });

    const result = await createRecoveryActivity(
      { playerId: PLAYER_ID, activityDate: "2026-05-20", saunaMinutes: 15 },
      USER_ID,
    );

    expect(RecoveryActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: PLAYER_ID, recordedBy: USER_ID }),
    );
    expect(result).toEqual(expect.objectContaining({ id: "r1" }));
  });

  it("throws 409 when a row already exists for the date", async () => {
    (RecoveryActivity.findOne as jest.Mock).mockResolvedValue({ id: "dup" });

    await expect(
      createRecoveryActivity(
        { playerId: PLAYER_ID, activityDate: "2026-05-20" },
        USER_ID,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("getRecoveryActivityById", () => {
  it("returns the record when found and access allowed", async () => {
    (RecoveryActivity.findByPk as jest.Mock).mockResolvedValue({
      id: "r1",
      playerId: PLAYER_ID,
    });

    const result = await getRecoveryActivityById("r1");
    expect(result).toEqual(expect.objectContaining({ id: "r1" }));
  });

  it("throws 404 when not found", async () => {
    (RecoveryActivity.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(getRecoveryActivityById("missing")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 404 when row access is denied", async () => {
    (RecoveryActivity.findByPk as jest.Mock).mockResolvedValue({
      id: "r1",
      playerId: PLAYER_ID,
    });
    (checkRowAccess as jest.Mock).mockResolvedValue(false);

    await expect(getRecoveryActivityById("r1")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("deleteRecoveryActivity", () => {
  it("destroys the record and returns its id", async () => {
    const destroy = jest.fn();
    (RecoveryActivity.findByPk as jest.Mock).mockResolvedValue({
      id: "r1",
      playerId: PLAYER_ID,
      destroy,
    });

    const result = await deleteRecoveryActivity("r1");
    expect(destroy).toHaveBeenCalled();
    expect(result).toEqual({ id: "r1" });
  });
});

describe("getTodayRecoveryForPlayer", () => {
  it("returns null when there is no row for today", async () => {
    (RecoveryActivity.findOne as jest.Mock).mockResolvedValue(null);

    const result = await getTodayRecoveryForPlayer(PLAYER_ID);
    expect(result).toBeNull();
  });

  it("returns today's totals when a row exists", async () => {
    (RecoveryActivity.findOne as jest.Mock).mockResolvedValue({
      saunaMinutes: 15,
      poolMinutes: 30,
      walkMinutes: null,
    });

    const result = await getTodayRecoveryForPlayer(PLAYER_ID);
    expect(result).toEqual({
      saunaMinutes: 15,
      poolMinutes: 30,
      walkMinutes: null,
    });
  });

  it("throws 404 when row access is denied", async () => {
    (checkRowAccess as jest.Mock).mockResolvedValue(false);

    await expect(getTodayRecoveryForPlayer(PLAYER_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});
