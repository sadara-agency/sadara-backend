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
    count: jest.fn(),
    create: jest.fn(),
  },
  WorkoutSetLog: { create: jest.fn(), findAll: jest.fn() },
}));

jest.mock("./trainingBlock.model", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

jest.mock("./developmentProgram.model", () => ({
  __esModule: true,
  DevelopmentProgram: { findAll: jest.fn() },
  ProgramExercise: {},
}));

jest.mock("./programDaySession.model", () => ({
  __esModule: true,
  ProgramDaySession: {},
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

import TrainingBlock from "./trainingBlock.model";
import { DevelopmentProgram } from "./developmentProgram.model";
import { getWeeklyWorkouts, getTodaysWorkout } from "./workoutPlan.service";

const PLAYER_ID = "11111111-1111-1111-1111-111111111111";
const BLOCK_ID = "33333333-3333-3333-3333-333333333333";

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
});

describe("getWeeklyWorkouts", () => {
  it("projects active program day-sessions into WorkoutSession-shaped objects", async () => {
    (TrainingBlock.findOne as jest.Mock).mockResolvedValue({ id: BLOCK_ID });
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

  it("returns [] when there is no active block and no directly-assigned program", async () => {
    (TrainingBlock.findOne as jest.Mock).mockResolvedValue(null);
    (DevelopmentProgram.findAll as jest.Mock).mockResolvedValue([]);

    const result = await getWeeklyWorkouts(PLAYER_ID);

    expect(result).toEqual([]);
  });

  it("includes directly player-assigned programs when no active block exists", async () => {
    (TrainingBlock.findOne as jest.Mock).mockResolvedValue(null);
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
    (TrainingBlock.findOne as jest.Mock).mockResolvedValue({ id: BLOCK_ID });
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
    (TrainingBlock.findOne as jest.Mock).mockResolvedValue({ id: BLOCK_ID });
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
