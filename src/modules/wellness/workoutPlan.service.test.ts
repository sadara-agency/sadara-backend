// Unit tests for the player-facing program-sourced workout read path.
// Sequelize models + shared utils mocked.

jest.mock("./workoutPlan.model", () => ({
  __esModule: true,
  WorkoutPlan: { findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  WorkoutPlanDay: { findAll: jest.fn(), create: jest.fn() },
  WorkoutPlanExercise: { create: jest.fn() },
  WorkoutSession: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findOrCreate: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  WorkoutSetLog: { create: jest.fn(), findAll: jest.fn() },
}));

jest.mock("./developmentProgram.model", () => ({
  __esModule: true,
  DevelopmentProgram: { findAll: jest.fn() },
  ProgramExercise: {},
}));

jest.mock("./programDaySession.model", () => ({
  __esModule: true,
  ProgramDaySession: { findAll: jest.fn() },
}));

jest.mock("./fitness.model", () => ({
  __esModule: true,
  WellnessExercise: {},
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

import { DevelopmentProgram } from "./developmentProgram.model";
import { WorkoutSession } from "./workoutPlan.model";
import {
  getWeeklyWorkouts,
  getTodaysWorkout,
  resolveOrMaterializeSession,
  completeSession,
} from "./workoutPlan.service";

const PLAYER_ID = "11111111-1111-1111-1111-111111111111";

function makeProgram(daySessions: unknown[]) {
  return {
    id: "prog-1",
    name: "4-Day Bulk Split",
    nameAr: "تقسيم تضخيم",
    category: "hypertrophy",
    daySessions,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // No materialized sessions by default — projection stays "pending".
  (WorkoutSession.findAll as jest.Mock).mockResolvedValue([]);
});

describe("getWeeklyWorkouts", () => {
  it("projects active program day-sessions into WorkoutSession-shaped objects", async () => {
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([
      makeProgram([
        {
          id: "ds-1",
          dayOfWeek: 1,
          label: "Push",
          labelAr: "دفع",
          orderIndex: 0,
          exercises: [
            {
              id: "pe-1",
              exerciseId: "ex-1",
              orderIndex: 0,
              targetSets: 4,
              targetReps: "8-12",
              targetWeightKg: 60,
              restSeconds: 90,
              notes: null,
              exercise: {
                id: "ex-1",
                name: "Bench Press",
                nameAr: "ضغط",
                muscleGroup: "chest",
                equipment: "barbell",
                videoUrl: null,
              },
            },
          ],
        },
        {
          id: "ds-2",
          dayOfWeek: 3,
          label: "Pull",
          labelAr: "سحب",
          orderIndex: 1,
          exercises: [],
        },
      ]),
    ]);

    const result = await getWeeklyWorkouts(PLAYER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].planId).toBe("prog-1");
    expect(result[0].playerId).toBe(PLAYER_ID);
    expect(result[0].plan.goal).toBe("hypertrophy");
    expect(result[0].planDay.label).toBe("دفع");
    expect(result[0].planDay.exercises[0].exercise?.name).toBe("Bench Press");
    expect(result[0].status).toBe("pending");
    // sorted by scheduledDate ascending (Mon before Wed)
    expect(
      result[0].scheduledDate.localeCompare(result[1].scheduledDate),
    ).toBeLessThan(0);
  });

  it("returns [] when the player has no assigned program", async () => {
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([]);

    const result = await getWeeklyWorkouts(PLAYER_ID);

    expect(result).toEqual([]);
  });

  it("includes directly player-assigned programs", async () => {
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([
      makeProgram([
        {
          id: "ds-x",
          dayOfWeek: 2,
          label: "Full Body",
          labelAr: null,
          orderIndex: 0,
          exercises: [],
        },
      ]),
    ]);

    const result = await getWeeklyWorkouts(PLAYER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].planDay.label).toBe("Full Body");
  });
});

describe("getTodaysWorkout", () => {
  it("returns null when no day-session maps to today", async () => {
    // Pick a dayOfWeek guaranteed not to be today by covering the opposite
    const notToday = (new Date().getUTCDay() + 3) % 7;
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([
      makeProgram([
        {
          id: "ds-1",
          dayOfWeek: notToday,
          label: "Legs",
          labelAr: null,
          orderIndex: 0,
          exercises: [],
        },
      ]),
    ]);

    const result = await getTodaysWorkout(PLAYER_ID);

    expect(result).toBeNull();
  });

  it("returns today's session when a day-session maps to today", async () => {
    const todayDow = new Date().getUTCDay();
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([
      makeProgram([
        {
          id: "ds-today",
          dayOfWeek: todayDow,
          label: "Today Session",
          labelAr: null,
          orderIndex: 0,
          exercises: [],
        },
      ]),
    ]);

    const result = await getTodaysWorkout(PLAYER_ID);

    expect(result).not.toBeNull();
    expect(result?.planDay.label).toBe("Today Session");
  });
});

describe("getWeeklyWorkouts — overlay", () => {
  it("overlays a materialized session's real id and status onto the projected day", async () => {
    const todayDow = new Date().getUTCDay();
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([
      makeProgram([
        {
          id: "ds-1",
          dayOfWeek: todayDow,
          label: "Push",
          labelAr: null,
          orderIndex: 0,
          exercises: [],
        },
      ]),
    ]);

    const now = new Date();
    // scheduledDate must match the projected day (weekStart + todayDow = today)
    const scheduledDate = now.toISOString().slice(0, 10);

    (WorkoutSession.findAll as jest.Mock).mockResolvedValue([
      {
        id: "real-session-1",
        planId: "prog-1",
        planDayId: "ds-1",
        scheduledDate,
        status: "completed",
        startedAt: new Date("2026-05-21T10:00:00Z"),
        completedAt: new Date("2026-05-21T11:00:00Z"),
        durationMin: 60,
        playerNotes: "felt strong",
      },
    ]);

    const result = await getWeeklyWorkouts(PLAYER_ID);
    const day = result.find((s) => s.planDayId === "ds-1");

    expect(day?.id).toBe("real-session-1");
    expect(day?.status).toBe("completed");
    expect(day?.durationMin).toBe(60);
    expect(day?.completedAt).toBe("2026-05-21T11:00:00.000Z");
  });
});

describe("resolveOrMaterializeSession", () => {
  function mockOwnedProgram() {
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([
      {
        id: "prog-1",
        name: "Split",
        nameAr: null,
        category: "strength",
        daySessions: [{ id: "ds-1", dayOfWeek: 1, exercises: [] }],
      },
    ]);
  }

  it("findOrCreates exactly one real session for a projected day", async () => {
    mockOwnedProgram();
    const created = { id: "real-1", planId: "prog-1", planDayId: "ds-1" };
    (WorkoutSession.findOrCreate as jest.Mock).mockResolvedValue([
      created,
      true,
    ]);

    const session = await resolveOrMaterializeSession(
      {
        programId: "prog-1",
        daySessionId: "ds-1",
        scheduledDate: "2026-05-21",
      },
      PLAYER_ID,
    );

    expect(WorkoutSession.findOrCreate).toHaveBeenCalledTimes(1);
    expect(WorkoutSession.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          planId: "prog-1",
          planDayId: "ds-1",
          scheduledDate: "2026-05-21",
        },
      }),
    );
    expect(session).toBe(created);
  });

  it("404s when the program is not accessible to the player", async () => {
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([]);

    await expect(
      resolveOrMaterializeSession(
        {
          programId: "nope",
          daySessionId: "ds-1",
          scheduledDate: "2026-05-21",
        },
        PLAYER_ID,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("404s when the day-session is not part of the program", async () => {
    mockOwnedProgram();

    await expect(
      resolveOrMaterializeSession(
        {
          programId: "prog-1",
          daySessionId: "ds-missing",
          scheduledDate: "2026-05-21",
        },
        PLAYER_ID,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("completeSession", () => {
  it("writes status, completedAt, duration and notes", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    (WorkoutSession.findByPk as jest.Mock).mockResolvedValue({
      id: "real-1",
      playerId: PLAYER_ID,
      status: "in_progress",
      startedAt: new Date(),
      durationMin: null,
      playerNotes: null,
      update,
    });

    await completeSession("real-1", PLAYER_ID, {
      durationMin: 45,
      playerNotes: "done",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        durationMin: 45,
        playerNotes: "done",
      }),
    );
  });

  it("403s when the session belongs to another player", async () => {
    (WorkoutSession.findByPk as jest.Mock).mockResolvedValue({
      id: "real-1",
      playerId: "someone-else",
      update: jest.fn(),
    });

    await expect(completeSession("real-1", PLAYER_ID)).rejects.toMatchObject({
      status: 403,
    });
  });
});
