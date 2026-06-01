import { Op } from "sequelize";
import { sequelize } from "@config/database";
import {
  DevelopmentProgram,
  ProgramExercise,
} from "./developmentProgram.model";
import { ProgramDaySession } from "./programDaySession.model";
import { WellnessExercise } from "./fitness.model";
import type {
  CreateProgramDTO,
  UpdateProgramDTO,
  CloneProgramDTO,
  UpdateExerciseDTO,
  AddExerciseToProgramDTO,
  ListProgramsQueryDTO,
  CreateDaySessionDTO,
  UpdateDaySessionDTO,
} from "./developmentProgram.validation";
import { AppError } from "@middleware/errorHandler";
import { buildMeta } from "@shared/utils/pagination";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { buildRowScope, checkRowAccess } from "@shared/utils/rowScope";
import type { AuthUser } from "@shared/types";

export async function listPrograms(
  query: ListProgramsQueryDTO,
  user?: AuthUser,
) {
  const { page, limit, programType, isActive, playerId, isTemplate } = query;
  const where: any = {};

  if (programType !== undefined) where.programType = programType;
  if (isActive !== undefined) where.isActive = isActive;
  if (playerId !== undefined) where.playerId = playerId;
  if (isTemplate !== undefined) where.isTemplate = isTemplate;

  // Row-scope: non-bypass roles see only their assigned players' programs.
  // Templates have playerId = null (excluded by the playerId-IN scope), so the
  // creator is allowed to see their own templates via an explicit OR branch.
  const scope = await buildRowScope("wellness", user);
  if (scope) {
    where[Op.and] = [
      ...(Array.isArray(where[Op.and]) ? where[Op.and] : []),
      { [Op.or]: [scope, { isTemplate: true, createdBy: user!.id }] },
    ];
  }

  const { rows, count } = await DevelopmentProgram.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getProgramById(
  id: string,
  user?: AuthUser,
): Promise<DevelopmentProgram> {
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

  // Access check only when a user is supplied (controller calls). Internal
  // calls (createProgram/clone returning the fresh row) pass no user.
  if (user) {
    const isOwnTemplate = program.isTemplate && program.createdBy === user.id;
    if (!isOwnTemplate) {
      const allowed = await checkRowAccess("wellness", program, user);
      if (!allowed) throw new AppError("Program not found", 404);
    }
  }
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

/**
 * Deep-copy a program (its day sessions + exercises) into a new program.
 * - "Use template" → clone(template → player): { playerId } set, asTemplate false.
 * - "Save as reusable" → clone(player program → template): asTemplate true, playerId null.
 * - "Duplicate" → clone onto the same player.
 * When `user` is provided the source is permission-checked via getProgramById.
 */
export async function cloneProgram(
  sourceId: string,
  opts: CloneProgramDTO,
  userId: string,
  user?: AuthUser,
): Promise<DevelopmentProgram> {
  const source = await getProgramById(sourceId, user);
  const asTemplate = opts.asTemplate ?? false;

  const created = await sequelize.transaction(async (tx) => {
    const program = await DevelopmentProgram.create(
      {
        name: source.name,
        nameAr: source.nameAr,
        description: source.description,
        category: source.category,
        estimatedMinutes: source.estimatedMinutes,
        durationWeeks: source.durationWeeks,
        phase: source.phase,
        programType: source.programType,
        playerId: asTemplate ? null : (opts.playerId ?? null),
        isActive: true,
        isTemplate: asTemplate,
        createdBy: userId,
      },
      { transaction: tx },
    );

    // Copy day sessions, mapping old → new ids so exercises re-link correctly.
    const sessionIdMap = new Map<string, string>();
    for (const ds of source.daySessions ?? []) {
      const newSession = await ProgramDaySession.create(
        {
          programId: program.id,
          dayOfWeek: ds.dayOfWeek,
          label: ds.label,
          labelAr: ds.labelAr,
          orderIndex: ds.orderIndex,
          estimatedMinutes: ds.estimatedMinutes,
          notes: ds.notes,
        },
        { transaction: tx },
      );
      sessionIdMap.set(ds.id, newSession.id);
    }

    // getProgramById returns program-level `exercises` AND nested
    // daySessions[].exercises — de-dup by id to avoid double-copying.
    const seen = new Set<string>();
    const allExercises = [
      ...(source.exercises ?? []),
      ...(source.daySessions ?? []).flatMap((d) => d.exercises ?? []),
    ];
    for (const pe of allExercises) {
      if (seen.has(pe.id)) continue;
      seen.add(pe.id);
      await ProgramExercise.create(
        {
          programId: program.id,
          exerciseId: pe.exerciseId,
          daySessionId: pe.daySessionId
            ? (sessionIdMap.get(pe.daySessionId) ?? null)
            : null,
          orderIndex: pe.orderIndex,
          targetSets: pe.targetSets,
          targetReps: pe.targetReps,
          targetWeightKg: pe.targetWeightKg,
          restSeconds: pe.restSeconds,
          notes: pe.notes,
        },
        { transaction: tx },
      );
    }

    return program;
  });

  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return getProgramById(created.id);
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

/**
 * Update one prescribed exercise row (sets/reps/rest/weight/notes) for the
 * flat inline editor. Matched by the ProgramExercise PK so the same exercise
 * appearing in two day sessions is edited unambiguously.
 */
export async function updateExerciseInProgram(
  programId: string,
  programExerciseId: string,
  data: UpdateExerciseDTO,
): Promise<ProgramExercise> {
  const row = await ProgramExercise.findOne({
    where: { id: programExerciseId, programId },
  });
  if (!row) throw new AppError("Exercise not found in this program", 404);
  await row.update(data);
  invalidateMultiple([CachePrefix.WELLNESS]).catch(() => {});
  return row;
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
