// Unit tests for syncExercisesFromExerciseDB and its helpers.
// All external I/O (fetch, Sequelize, DB query) is mocked.

import { sequelize } from "@config/database";

// ── Mock Sequelize & model before importing the service ──
jest.mock("@config/database", () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

jest.mock("./fitness.model", () => ({
  WellnessExercise: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
  },
}));

// Mock all other modules fitness.service.ts imports
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
  parsePagination: jest.fn(() => ({ limit: 20, offset: 0, page: 1 })),
  buildMeta: jest.fn(() => ({})),
}));

import { syncExercisesFromExerciseDB } from "./fitness.service";
import { WellnessExercise } from "./fitness.model";
import { QueryTypes } from "sequelize";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const ADMIN_ID = "a0000001-0000-0000-0000-000000000001";

const SAMPLE_EXERCISE = {
  exerciseId: "exr_abc123",
  name: "Bench Press",
  bodyParts: ["CHEST"],
  targetMuscles: ["Pectoralis Major"],
  secondaryMuscles: ["Deltoid Anterior", "Triceps Brachii"],
  equipments: ["BARBELL"],
  instructions: ["Lie on bench.", "Press the bar up."],
  gifUrl: "https://static.exercisedb.dev/media/exr_abc123.gif",
};

beforeEach(() => {
  jest.clearAllMocks();
  (sequelize.query as jest.Mock).mockResolvedValue([{ id: ADMIN_ID }]);
  (WellnessExercise.bulkCreate as jest.Mock).mockResolvedValue([]);
});

describe("syncExercisesFromExerciseDB", () => {
  it("fetches exercises and upserts them", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [SAMPLE_EXERCISE],
    });

    const result = await syncExercisesFromExerciseDB();

    expect(result.upserted).toBe(1);
    expect(result.total).toBe(1);
    expect(WellnessExercise.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Bench Press",
          muscleGroup: "chest",
          equipment: "barbell",
          externalDbId: "exr_abc123",
          gifUrl: "https://static.exercisedb.dev/media/exr_abc123.gif",
          createdBy: ADMIN_ID,
        }),
      ]),
      expect.objectContaining({ updateOnDuplicate: expect.any(Array) }),
    );
  });

  it("handles wrapped { data: [] } response shape", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [SAMPLE_EXERCISE] }),
    });

    const result = await syncExercisesFromExerciseDB();
    expect(result.upserted).toBe(1);
  });

  it("skips exercises missing exerciseId", async () => {
    const noId = { ...SAMPLE_EXERCISE, exerciseId: "" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [noId, SAMPLE_EXERCISE],
    });

    const result = await syncExercisesFromExerciseDB();
    expect(result.upserted).toBe(1);
  });

  it("throws AppError when fetch fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    await expect(syncExercisesFromExerciseDB()).rejects.toMatchObject({
      status: 502,
    });
    expect(WellnessExercise.bulkCreate).not.toHaveBeenCalled();
  });

  it("throws AppError when no Admin user exists", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [SAMPLE_EXERCISE],
    });
    (sequelize.query as jest.Mock).mockResolvedValue([]);

    await expect(syncExercisesFromExerciseDB()).rejects.toMatchObject({
      status: 500,
    });
  });

  it("constructs gifUrl from exerciseId when gifUrl field is absent", async () => {
    const noGif = { ...SAMPLE_EXERCISE, gifUrl: undefined };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [noGif],
    });

    await syncExercisesFromExerciseDB();

    expect(WellnessExercise.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          gifUrl: expect.stringContaining("exerciseId=exr_abc123"),
        }),
      ]),
      expect.anything(),
    );
  });
});

describe("muscle group and equipment mapping", () => {
  // These are tested indirectly through syncExercisesFromExerciseDB

  const runSync = async (
    bodyParts: string[],
    targetMuscles: string[],
    equipments: string[],
  ) => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { ...SAMPLE_EXERCISE, bodyParts, targetMuscles, equipments },
      ],
    });
    await syncExercisesFromExerciseDB();
    const call = (WellnessExercise.bulkCreate as jest.Mock).mock.calls[0][0][0];
    return call as { muscleGroup: string; equipment: string };
  };

  beforeEach(() => {
    (sequelize.query as jest.Mock).mockResolvedValue([{ id: ADMIN_ID }]);
    (WellnessExercise.bulkCreate as jest.Mock).mockResolvedValue([]);
  });

  it.each([
    [["CHEST"], ["Pectoralis Major"], "chest"],
    [["BACK"], ["Latissimus Dorsi"], "back"],
    [["SHOULDER"], ["Deltoid"], "shoulders"],
    [["ARM"], ["Biceps Brachii"], "biceps"],
    [["ARM"], ["Triceps Brachii"], "triceps"],
    [["WAIST"], ["Abs"], "core"],
    [["UPPER LEG"], ["Quadriceps"], "quads"],
    [["UPPER LEG"], ["Hamstrings"], "hamstrings"],
    [["LOWER LEG"], ["Gastrocnemius"], "calves"],
  ])(
    "maps bodyPart=%s target=%s → muscleGroup=%s",
    async (bodyParts, targetMuscles, expected) => {
      jest.clearAllMocks();
      (sequelize.query as jest.Mock).mockResolvedValue([{ id: ADMIN_ID }]);
      (WellnessExercise.bulkCreate as jest.Mock).mockResolvedValue([]);
      const result = await runSync(bodyParts, targetMuscles, ["BARBELL"]);
      expect(result.muscleGroup).toBe(expected);
    },
  );

  it.each([
    [["BARBELL"], "barbell"],
    [["DUMBBELL"], "dumbbell"],
    [["CABLE"], "cable"],
    [["LEVERAGE MACHINE"], "machine"],
    [["BODY WEIGHT"], "bodyweight"],
    [["KETTLEBELL"], "kettlebell"],
    [["RESISTANCE BAND"], "band"],
    [["CARDIO"], "cardio_machine"],
    [["UNKNOWN"], "other"],
  ])("maps equipment=%s → %s", async (equipments, expected) => {
    jest.clearAllMocks();
    (sequelize.query as jest.Mock).mockResolvedValue([{ id: ADMIN_ID }]);
    (WellnessExercise.bulkCreate as jest.Mock).mockResolvedValue([]);
    const result = await runSync(["CHEST"], ["Pectoralis Major"], equipments);
    expect(result.equipment).toBe(expected);
  });
});
