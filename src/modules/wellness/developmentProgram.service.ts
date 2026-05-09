import {
  DevelopmentProgram,
  ProgramExercise,
} from "./developmentProgram.model";
import { ProgramDaySession } from "./programDaySession.model";
import { WellnessExercise } from "./fitness.model";
import type {
  CreateProgramDTO,
  UpdateProgramDTO,
  AddExerciseToProgramDTO,
  ListProgramsQueryDTO,
  CreateDaySessionDTO,
  UpdateDaySessionDTO,
} from "./developmentProgram.validation";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";

export async function listPrograms(query: ListProgramsQueryDTO) {
  const { page, limit, trainingBlockId, programType, isActive } = query;
  const where: any = {};

  if (trainingBlockId !== undefined) where.trainingBlockId = trainingBlockId;
  if (programType !== undefined) where.programType = programType;
  if (isActive !== undefined) where.isActive = isActive;

  const { rows, count } = await DevelopmentProgram.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getProgramById(id: string): Promise<DevelopmentProgram> {
  const program = await DevelopmentProgram.findByPk(id, {
    include: [
      {
        model: ProgramExercise,
        as: "exercises",
        include: [{ model: WellnessExercise, as: "exercise" }],
      },
      {
        model: ProgramDaySession,
        as: "daySessions",
        include: [
          {
            model: ProgramExercise,
            as: "exercises",
            include: [{ model: WellnessExercise, as: "exercise" }],
          },
        ],
      },
    ],
    order: [
      [{ model: ProgramExercise, as: "exercises" }, "orderIndex", "ASC"],
      [{ model: ProgramDaySession, as: "daySessions" }, "orderIndex", "ASC"],
    ],
  });
  if (!program) throw new AppError("Program not found", 404);
  return program;
}

export async function createProgram(
  data: CreateProgramDTO,
  userId: string,
): Promise<DevelopmentProgram> {
  const program = await DevelopmentProgram.create({
    ...data,
    createdBy: userId,
  });
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return getProgramById(program.id);
}

export async function updateProgram(
  id: string,
  data: UpdateProgramDTO,
): Promise<DevelopmentProgram> {
  const program = await getProgramById(id);
  await program.update(data);
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return getProgramById(id);
}

export async function deleteProgram(id: string): Promise<{ id: string }> {
  const program = await getProgramById(id);

  // Soft-delete: deactivate if sessions reference this program
  const hasSessions = await hasLinkedSessions(id);
  if (hasSessions) {
    await program.update({ isActive: false });
  } else {
    await program.destroy();
  }

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { id };
}

async function hasLinkedSessions(programId: string): Promise<boolean> {
  // Defer import to avoid circular dependency when developmentSession.model is created
  try {
    const { sequelize } = await import("@config/database");
    const [rows] = await sequelize.query(
      `SELECT 1 FROM development_sessions WHERE program_id = :programId LIMIT 1`,
      { replacements: { programId } },
    );
    return (rows as unknown[]).length > 0;
  } catch {
    // Table doesn't exist yet (Session 1b not run)
    return false;
  }
}

export async function addExerciseToProgram(
  programId: string,
  data: AddExerciseToProgramDTO,
): Promise<ProgramExercise> {
  // Ensure program exists
  await getProgramById(programId);

  // Validate daySessionId belongs to this program
  if (data.daySessionId) {
    const session = await ProgramDaySession.findOne({
      where: { id: data.daySessionId, programId },
    });
    if (!session)
      throw new AppError("Day session not found in this program", 404);
  }

  // Default orderIndex to current max + 1 (scoped to session when provided)
  if (data.orderIndex === undefined) {
    const where: Record<string, unknown> = { programId };
    if (data.daySessionId) where.daySessionId = data.daySessionId;
    const maxRow = await ProgramExercise.findOne({
      where,
      order: [["orderIndex", "DESC"]],
    });
    data.orderIndex = maxRow ? maxRow.orderIndex + 1 : 0;
  }

  const exercise = await ProgramExercise.create({
    programId,
    exerciseId: data.exerciseId,
    daySessionId: data.daySessionId ?? null,
    orderIndex: data.orderIndex,
    targetSets: data.targetSets ?? 3,
    targetReps: data.targetReps ?? "8-12",
    targetWeightKg: data.targetWeightKg,
    restSeconds: data.restSeconds ?? 90,
    notes: data.notes,
  });

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return exercise;
}

export async function removeExerciseFromProgram(
  programId: string,
  exerciseId: string,
): Promise<{ programId: string; exerciseId: string }> {
  const row = await ProgramExercise.findOne({
    where: { programId, exerciseId },
  });
  if (!row) throw new AppError("Exercise not found in this program", 404);
  await row.destroy();
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { programId, exerciseId };
}

export async function reorderExercises(
  programId: string,
  orderedExerciseIds: string[],
): Promise<DevelopmentProgram> {
  await getProgramById(programId);

  await Promise.all(
    orderedExerciseIds.map((exerciseId, index) =>
      ProgramExercise.update(
        { orderIndex: index },
        { where: { programId, exerciseId } },
      ),
    ),
  );

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return getProgramById(programId);
}

// ── DaySession service functions ──

export async function listDaySessions(
  programId: string,
): Promise<ProgramDaySession[]> {
  await getProgramById(programId);
  return ProgramDaySession.findAll({
    where: { programId },
    include: [
      {
        model: ProgramExercise,
        as: "exercises",
        include: [{ model: WellnessExercise, as: "exercise" }],
      },
    ],
    order: [
      ["orderIndex", "ASC"],
      [{ model: ProgramExercise, as: "exercises" }, "orderIndex", "ASC"],
    ],
  });
}

export async function createDaySession(
  programId: string,
  data: CreateDaySessionDTO,
): Promise<ProgramDaySession> {
  await getProgramById(programId);

  if (data.orderIndex === undefined) {
    const maxRow = await ProgramDaySession.findOne({
      where: { programId },
      order: [["orderIndex", "DESC"]],
    });
    data.orderIndex = maxRow ? maxRow.orderIndex + 1 : 0;
  }

  const session = await ProgramDaySession.create({ ...data, programId });
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return session;
}

export async function updateDaySession(
  programId: string,
  sessionId: string,
  data: UpdateDaySessionDTO,
): Promise<ProgramDaySession> {
  const session = await ProgramDaySession.findOne({
    where: { id: sessionId, programId },
  });
  if (!session) throw new AppError("Day session not found", 404);
  await session.update(data);
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return session;
}

export async function deleteDaySession(
  programId: string,
  sessionId: string,
): Promise<{ id: string }> {
  const session = await ProgramDaySession.findOne({
    where: { id: sessionId, programId },
  });
  if (!session) throw new AppError("Day session not found", 404);
  await session.destroy();
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return { id: sessionId };
}
