// Unit tests for developmentProgram.service — clone, inline update, and the
// row-scope + template carve-out on listPrograms. Sequelize models + shared
// utils mocked.

jest.mock("./developmentProgram.model", () => ({
  __esModule: true,
  DevelopmentProgram: {
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
  },
  ProgramExercise: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock("./programDaySession.model", () => ({
  __esModule: true,
  ProgramDaySession: { create: jest.fn(), findOne: jest.fn() },
}));

jest.mock("./programDayCompletion.model", () => ({
  __esModule: true,
  ProgramDayCompletion: {
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("./fitness.model", () => ({
  __esModule: true,
  WellnessExercise: {},
}));

jest.mock("@config/database", () => ({
  __esModule: true,
  sequelize: {
    transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb({})),
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

jest.mock("@shared/utils/pagination", () => ({
  buildMeta: jest.fn(() => ({ page: 1, limit: 20, total: 0, totalPages: 0 })),
}));

jest.mock("@shared/utils/cache", () => ({
  invalidateMultiple: jest.fn(async () => {}),
  CachePrefix: { WELLNESS: "wellness", DASHBOARD: "dash" },
}));

jest.mock("@shared/utils/rowScope", () => ({
  buildRowScope: jest.fn(async () => null),
  checkRowAccess: jest.fn(async () => true),
}));

import { Op } from "sequelize";
import {
  DevelopmentProgram,
  ProgramExercise,
} from "./developmentProgram.model";
import { ProgramDaySession } from "./programDaySession.model";
import { ProgramDayCompletion } from "./programDayCompletion.model";
import {
  cloneProgram,
  updateExerciseInProgram,
  listPrograms,
} from "./developmentProgram.service";
import * as svc from "./developmentProgram.service";
import { buildRowScope, checkRowAccess } from "@shared/utils/rowScope";

const USER_ID = "22222222-2222-2222-2222-222222222222";
const PLAYER_ID = "11111111-1111-1111-1111-111111111111";
const coachUser = { id: USER_ID, role: "Coach" } as any;

beforeEach(() => {
  jest.clearAllMocks();
  (checkRowAccess as jest.Mock).mockResolvedValue(true);
  (buildRowScope as jest.Mock).mockResolvedValue(null);
});

describe("cloneProgram", () => {
  it("clones a template onto a player, remapping day-session ids", async () => {
    const template = {
      id: "tpl-1",
      name: "3-Day Gym",
      nameAr: null,
      description: null,
      category: "strength",
      estimatedMinutes: null,
      durationWeeks: 4,
      phase: null,
      programType: "gym",
      isTemplate: true,
      createdBy: USER_ID,
      exercises: [],
      daySessions: [
        {
          id: "ds-old",
          dayOfWeek: null,
          label: "Day 1",
          labelAr: null,
          orderIndex: 0,
          estimatedMinutes: null,
          notes: null,
          exercises: [
            {
              id: "pe-old",
              exerciseId: "ex-1",
              daySessionId: "ds-old",
              orderIndex: 0,
              targetSets: 4,
              targetReps: "6-8",
              targetWeightKg: 60,
              restSeconds: 90,
              notes: null,
            },
          ],
        },
      ],
    };

    (DevelopmentProgram.findByPk as jest.Mock)
      .mockResolvedValueOnce(template) // source fetch
      .mockResolvedValueOnce({ id: "clone-1" }); // return after clone
    (DevelopmentProgram.create as jest.Mock).mockResolvedValue({
      id: "clone-1",
    });
    (ProgramDaySession.create as jest.Mock).mockResolvedValue({ id: "ds-new" });
    (ProgramExercise.create as jest.Mock).mockResolvedValue({ id: "pe-new" });

    const result = await cloneProgram(
      "tpl-1",
      { playerId: PLAYER_ID, asTemplate: false },
      USER_ID,
      coachUser,
    );

    expect(DevelopmentProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: PLAYER_ID,
        isTemplate: false,
        createdBy: USER_ID,
        name: "3-Day Gym",
      }),
      expect.anything(),
    );
    expect(ProgramExercise.create).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: "ex-1", daySessionId: "ds-new" }),
      expect.anything(),
    );
    expect(result).toEqual({ id: "clone-1" });
  });

  it("saves a player program as a reusable template (playerId null, isTemplate true)", async () => {
    const program = {
      id: "p-1",
      name: "Pre-season",
      category: "strength",
      durationWeeks: 4,
      programType: "gym",
      isTemplate: false,
      createdBy: USER_ID,
      daySessions: [],
      exercises: [
        {
          id: "pe1",
          exerciseId: "ex1",
          daySessionId: null,
          orderIndex: 0,
          targetSets: 3,
          targetReps: "8-12",
          targetWeightKg: null,
          restSeconds: 90,
          notes: null,
        },
      ],
    };
    (DevelopmentProgram.findByPk as jest.Mock)
      .mockResolvedValueOnce(program)
      .mockResolvedValueOnce({ id: "tpl-new" });
    (DevelopmentProgram.create as jest.Mock).mockResolvedValue({
      id: "tpl-new",
    });
    (ProgramExercise.create as jest.Mock).mockResolvedValue({ id: "pe-new" });

    await cloneProgram("p-1", { asTemplate: true }, USER_ID, coachUser);

    expect(DevelopmentProgram.create).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: null, isTemplate: true }),
      expect.anything(),
    );
    expect(ProgramExercise.create).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: "ex1", daySessionId: null }),
      expect.anything(),
    );
  });

  it("throws 404 when the source program does not exist", async () => {
    (DevelopmentProgram.findByPk as jest.Mock).mockResolvedValue(null);
    await expect(
      cloneProgram("missing", { asTemplate: false }, USER_ID, coachUser),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("throws 404 when the source is outside the coach's scope", async () => {
    (DevelopmentProgram.findByPk as jest.Mock).mockResolvedValue({
      id: "p-2",
      playerId: "other-player",
      isTemplate: false,
      createdBy: "someone-else",
      daySessions: [],
      exercises: [],
    });
    (checkRowAccess as jest.Mock).mockResolvedValue(false);

    await expect(
      cloneProgram(
        "p-2",
        { playerId: PLAYER_ID, asTemplate: false },
        USER_ID,
        coachUser,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(DevelopmentProgram.create).not.toHaveBeenCalled();
  });
});

describe("listPrograms row-scope", () => {
  it("ORs the coach scope with their own templates", async () => {
    (buildRowScope as jest.Mock).mockResolvedValue({
      playerId: { [Op.in]: ["p1"] },
    });
    (DevelopmentProgram.findAndCountAll as jest.Mock).mockResolvedValue({
      rows: [],
      count: 0,
    });

    await listPrograms({ page: 1, limit: 20 } as any, coachUser);

    const whereArg = (DevelopmentProgram.findAndCountAll as jest.Mock).mock
      .calls[0][0].where;
    const andBranch = whereArg[Op.and];
    expect(Array.isArray(andBranch)).toBe(true);
    const orClause = andBranch[0][Op.or];
    expect(orClause).toEqual([
      { playerId: { [Op.in]: ["p1"] } },
      { isTemplate: true, createdBy: USER_ID },
    ]);
  });

  it("applies no scope branch for bypass roles (buildRowScope null)", async () => {
    (buildRowScope as jest.Mock).mockResolvedValue(null);
    (DevelopmentProgram.findAndCountAll as jest.Mock).mockResolvedValue({
      rows: [],
      count: 0,
    });

    await listPrograms(
      { page: 1, limit: 20 } as any,
      {
        id: "admin",
        role: "Admin",
      } as any,
    );

    const whereArg = (DevelopmentProgram.findAndCountAll as jest.Mock).mock
      .calls[0][0].where;
    expect(whereArg[Op.and]).toBeUndefined();
  });
});

describe("updateExerciseInProgram", () => {
  it("updates the matched row and returns it", async () => {
    const update = jest.fn();
    (ProgramExercise.findOne as jest.Mock).mockResolvedValue({
      id: "pe-1",
      programId: "prog-1",
      update,
    });

    await updateExerciseInProgram("prog-1", "pe-1", { targetWeightKg: 70 });
    expect(update).toHaveBeenCalledWith({ targetWeightKg: 70 });
  });

  it("throws 404 when the exercise row is not in the program", async () => {
    (ProgramExercise.findOne as jest.Mock).mockResolvedValue(null);
    await expect(
      updateExerciseInProgram("prog-1", "missing", { targetSets: 5 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("completions", () => {
  const player = { id: "u1", playerId: "p1", role: "Player" } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    // getProgramById's row-scope check must pass for player "p1".
    (checkRowAccess as jest.Mock).mockResolvedValue(true);
    (buildRowScope as jest.Mock).mockResolvedValue(null);
  });

  it("markDayComplete: 403 when user has no playerId", async () => {
    await expect(
      svc.markDayComplete(
        "prog1",
        { daySessionId: "ds1", completedDate: "2026-06-03" },
        { id: "u2", playerId: null, role: "Coach" } as any,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("markDayComplete: 422 when day session not in program", async () => {
    (DevelopmentProgram.findByPk as jest.Mock).mockResolvedValue({
      id: "prog1",
      playerId: "p1",
      isTemplate: false,
    });
    (ProgramDaySession.findOne as jest.Mock).mockResolvedValue(null);
    await expect(
      svc.markDayComplete(
        "prog1",
        { daySessionId: "dsX", completedDate: "2026-06-03" },
        player,
      ),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("markDayComplete: idempotent findOrCreate returns the row", async () => {
    (DevelopmentProgram.findByPk as jest.Mock).mockResolvedValue({
      id: "prog1",
      playerId: "p1",
      isTemplate: false,
    });
    (ProgramDaySession.findOne as jest.Mock).mockResolvedValue({
      id: "ds1",
      programId: "prog1",
    });
    const row = { id: "c1", daySessionId: "ds1", completedDate: "2026-06-03" };
    (ProgramDayCompletion.findOrCreate as jest.Mock).mockResolvedValue([
      row,
      true,
    ]);
    const result = await svc.markDayComplete(
      "prog1",
      { daySessionId: "ds1", completedDate: "2026-06-03" },
      player,
    );
    expect(result).toEqual(row);
    expect(ProgramDayCompletion.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          playerId: "p1",
          daySessionId: "ds1",
          completedDate: "2026-06-03",
        },
        defaults: expect.objectContaining({
          programId: "prog1",
          playerId: "p1",
          daySessionId: "ds1",
          completedDate: "2026-06-03",
        }),
      }),
    );
  });

  it("unmarkDayComplete: destroys the row and resolves ok", async () => {
    (DevelopmentProgram.findByPk as jest.Mock).mockResolvedValue({
      id: "prog1",
      playerId: "p1",
      isTemplate: false,
    });
    (ProgramDayCompletion.destroy as jest.Mock).mockResolvedValue(1);
    const result = await svc.unmarkDayComplete(
      "prog1",
      { daySessionId: "ds1", completedDate: "2026-06-03" },
      player,
    );
    expect(result).toEqual({ ok: true });
  });

  it("listCompletions: returns mapped rows for the player's program", async () => {
    (DevelopmentProgram.findByPk as jest.Mock).mockResolvedValue({
      id: "prog1",
      playerId: "p1",
      isTemplate: false,
    });
    (ProgramDayCompletion.findAll as jest.Mock).mockResolvedValue([
      { daySessionId: "ds1", completedDate: "2026-06-03" },
    ]);
    const result = await svc.listCompletions("prog1", {}, player);
    expect(result).toEqual([
      { daySessionId: "ds1", completedDate: "2026-06-03" },
    ]);
  });
});
