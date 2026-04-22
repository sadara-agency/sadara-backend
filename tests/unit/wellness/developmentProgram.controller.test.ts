/// <reference types="jest" />
// ─────────────────────────────────────────────────────────────
// tests/unit/wellness/developmentProgram.controller.test.ts
// Unit tests for developmentProgram.controller
// ─────────────────────────────────────────────────────────────

jest.mock("../../../src/modules/wellness/developmentProgram.service");
jest.mock("../../../src/shared/utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  buildAuditContext: jest
    .fn()
    .mockReturnValue({ userId: "u1", userName: "Coach", userRole: "GymCoach" }),
}));
jest.mock("../../../src/shared/utils/cache", () => ({
  invalidateMultiple: jest.fn().mockResolvedValue(undefined),
  CachePrefix: { WELLNESS: "wellness", DASHBOARD: "dashboard" },
}));

import * as ctrl from "../../../src/modules/wellness/developmentProgram.controller";
import * as svc from "../../../src/modules/wellness/developmentProgram.service";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    user: { id: "user-001", fullName: "Coach", role: "GymCoach" },
    ip: "127.0.0.1",
    ...overrides,
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const mockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const PROGRAM_ID = "550e8400-e29b-41d4-a716-446655440001";
const EXERCISE_ID = "550e8400-e29b-41d4-a716-446655440002";

const fakeProgram = {
  id: PROGRAM_ID,
  name: "4-Week Field Program",
  programType: "field",
  phase: "accumulation",
  durationWeeks: 4,
  category: "cardio",
  isActive: true,
  exercises: [],
};

const fakeProgramExercise = {
  id: "550e8400-e29b-41d4-a716-446655440003",
  programId: PROGRAM_ID,
  exerciseId: EXERCISE_ID,
  orderIndex: 0,
  targetSets: 3,
  targetReps: "10-12",
};

describe("DevelopmentProgram Controller", () => {
  beforeEach(() => jest.clearAllMocks());

  // ════════════════════════════════════════════════════════
  // list
  // ════════════════════════════════════════════════════════
  describe("list", () => {
    it("returns paginated programs", async () => {
      (svc.listPrograms as jest.Mock).mockResolvedValue({
        data: [fakeProgram],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const res = mockRes();
      await ctrl.list(mockReq({ query: {} }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ════════════════════════════════════════════════════════
  // getById
  // ════════════════════════════════════════════════════════
  describe("getById", () => {
    it("returns program with exercises", async () => {
      (svc.getProgramById as jest.Mock).mockResolvedValue({
        ...fakeProgram,
        exercises: [fakeProgramExercise],
      });
      const res = mockRes();
      await ctrl.getById(mockReq({ params: { id: PROGRAM_ID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.getProgramById).toHaveBeenCalledWith(PROGRAM_ID);
    });

    it("propagates 404 when program does not exist", async () => {
      (svc.getProgramById as jest.Mock).mockRejectedValue({
        statusCode: 404,
        message: "Program not found",
      });
      const res = mockRes();
      await expect(
        ctrl.getById(mockReq({ params: { id: PROGRAM_ID } }), res),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ════════════════════════════════════════════════════════
  // create
  // ════════════════════════════════════════════════════════
  describe("create", () => {
    it("creates program and returns 201", async () => {
      (svc.createProgram as jest.Mock).mockResolvedValue(fakeProgram);
      const res = mockRes();
      await ctrl.create(
        mockReq({
          body: {
            name: "4-Week Field Program",
            category: "cardio",
            programType: "field",
            durationWeeks: 4,
            phase: "accumulation",
          },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(svc.createProgram).toHaveBeenCalledWith(
        expect.objectContaining({ programType: "field" }),
        "user-001",
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // update
  // ════════════════════════════════════════════════════════
  describe("update", () => {
    it("updates program and returns 200", async () => {
      (svc.updateProgram as jest.Mock).mockResolvedValue({
        ...fakeProgram,
        phase: "intensification",
      });
      const res = mockRes();
      await ctrl.update(
        mockReq({ params: { id: PROGRAM_ID }, body: { phase: "intensification" } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.updateProgram).toHaveBeenCalledWith(
        PROGRAM_ID,
        { phase: "intensification" },
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // remove (delete)
  // ════════════════════════════════════════════════════════
  describe("remove", () => {
    it("returns 200 with id", async () => {
      (svc.deleteProgram as jest.Mock).mockResolvedValue({ id: PROGRAM_ID });
      const res = mockRes();
      await ctrl.remove(mockReq({ params: { id: PROGRAM_ID } }), res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("propagates 404 when program not found", async () => {
      (svc.deleteProgram as jest.Mock).mockRejectedValue({
        statusCode: 404,
        message: "Program not found",
      });
      const res = mockRes();
      await expect(
        ctrl.remove(mockReq({ params: { id: PROGRAM_ID } }), res),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ════════════════════════════════════════════════════════
  // addExercise
  // ════════════════════════════════════════════════════════
  describe("addExercise", () => {
    it("adds exercise and returns 201", async () => {
      (svc.addExerciseToProgram as jest.Mock).mockResolvedValue(fakeProgramExercise);
      const res = mockRes();
      await ctrl.addExercise(
        mockReq({
          params: { id: PROGRAM_ID },
          body: { exerciseId: EXERCISE_ID },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(svc.addExerciseToProgram).toHaveBeenCalledWith(
        PROGRAM_ID,
        expect.objectContaining({ exerciseId: EXERCISE_ID }),
      );
    });
  });

  // ════════════════════════════════════════════════════════
  // removeExercise
  // ════════════════════════════════════════════════════════
  describe("removeExercise", () => {
    it("removes exercise and returns 200", async () => {
      (svc.removeExerciseFromProgram as jest.Mock).mockResolvedValue({
        programId: PROGRAM_ID,
        exerciseId: EXERCISE_ID,
      });
      const res = mockRes();
      await ctrl.removeExercise(
        mockReq({ params: { id: PROGRAM_ID, exerciseId: EXERCISE_ID } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ════════════════════════════════════════════════════════
  // reorderExercises
  // ════════════════════════════════════════════════════════
  describe("reorderExercises", () => {
    it("reorders and returns updated program", async () => {
      (svc.reorderExercises as jest.Mock).mockResolvedValue(fakeProgram);
      const res = mockRes();
      await ctrl.reorderExercises(
        mockReq({
          params: { id: PROGRAM_ID },
          body: { orderedExerciseIds: [EXERCISE_ID] },
        }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.reorderExercises).toHaveBeenCalledWith(
        PROGRAM_ID,
        [EXERCISE_ID],
      );
    });
  });
});
