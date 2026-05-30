// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/fitness.service.ts
//
// Business logic for Phase 3: Exercises, Templates, Assignments,
// Workout Logging, Progressive Overload
// ═══════════════════════════════════════════════════════════════

import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import {
  WellnessExercise,
  WellnessWorkoutTemplate,
  WellnessTemplateExercise,
  WellnessWorkoutAssignment,
} from "./fitness.model";
import type { Equipment, MuscleGroup } from "./fitness.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "./wellness.validation";

// ══════════════════════════════════════════
// EXERCISES
// ══════════════════════════════════════════

export async function listExercises(queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "name");
  const where: any = {};

  if (queryParams.muscleGroup) where.muscleGroup = queryParams.muscleGroup;
  if (queryParams.equipment) where.equipment = queryParams.equipment;
  if (queryParams.level) where.level = queryParams.level;
  if (queryParams.mechanic) where.mechanic = queryParams.mechanic;
  if (queryParams.active !== undefined)
    where.isActive = queryParams.active === "true";
  if (queryParams.search)
    where.name = { [Op.iLike]: `%${queryParams.search}%` };

  const { count, rows } = await WellnessExercise.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getExercise(id: string) {
  const exercise = await WellnessExercise.findByPk(id);
  if (!exercise) throw new AppError("Exercise not found", 404);
  return exercise;
}

/**
 * Extract YouTube video thumbnail from URL.
 */
function extractVideoThumbnail(url?: string | null): string | null {
  if (!url) return null;
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return null;
}

export async function createExercise(
  body: CreateExerciseInput,
  userId: string,
) {
  const thumbnail = extractVideoThumbnail(body.videoUrl);
  return WellnessExercise.create({
    ...body,
    videoThumbnail: thumbnail,
    createdBy: userId,
  } as any);
}

export async function updateExercise(id: string, body: UpdateExerciseInput) {
  const exercise = await getExercise(id);
  const updates: any = { ...body };
  if (body.videoUrl !== undefined) {
    updates.videoThumbnail = extractVideoThumbnail(body.videoUrl);
  }
  await exercise.update(updates);
  return exercise;
}

export async function deleteExercise(id: string) {
  const exercise = await getExercise(id);
  await exercise.update({ isActive: false });
}

// ══════════════════════════════════════════
// EXERCISEDB OSS SYNC
// ══════════════════════════════════════════

interface ExerciseDBItem {
  exerciseId: string;
  name: string;
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipments: string[];
  instructions: string[];
  gifUrl?: string;
}

function mapEqFromEDB(equipments: string[]): Equipment {
  const raw = (equipments[0] ?? "").toUpperCase();
  if (raw.includes("BARBELL")) return "barbell";
  if (raw.includes("DUMBBELL")) return "dumbbell";
  if (raw.includes("CABLE")) return "cable";
  if (
    raw.includes("LEVERAGE") ||
    raw.includes("SMITH") ||
    raw.includes("MACHINE")
  )
    return "machine";
  if (raw.includes("BODY") || raw.includes("BODYWEIGHT")) return "bodyweight";
  if (raw.includes("KETTLEBELL")) return "kettlebell";
  if (raw.includes("BAND") || raw.includes("RESISTANCE")) return "band";
  if (raw.includes("CARDIO")) return "cardio_machine";
  return "other";
}

function mapMGFromEDB(
  bodyParts: string[],
  targetMuscles: string[],
): MuscleGroup {
  const part = (bodyParts[0] ?? "").toUpperCase();
  const target = (targetMuscles[0] ?? "").toUpperCase();
  if (part.includes("CHEST") || target.includes("PECTORAL")) return "chest";
  if (
    part.includes("BACK") ||
    target.includes("LAT") ||
    target.includes("TRAPEZIUS") ||
    target.includes("RHOMBOID")
  )
    return "back";
  if (part.includes("SHOULDER") || target.includes("DELTOID"))
    return "shoulders";
  if (target.includes("BICEP")) return "biceps";
  if (target.includes("TRICEP")) return "triceps";
  if (
    part.includes("FOREARM") ||
    target.includes("FOREARM") ||
    target.includes("BRACHIORADIALIS")
  )
    return "forearms";
  if (
    part.includes("WAIST") ||
    target.includes("ABS") ||
    target.includes("OBLIQUE") ||
    target.includes("ABDOMINAL")
  )
    return "core";
  if (
    part.includes("UPPER LEG") ||
    target.includes("QUAD") ||
    target.includes("HAMSTRING")
  ) {
    if (target.includes("HAMSTRING")) return "hamstrings";
    if (target.includes("GLUTE")) return "glutes";
    return "quads";
  }
  if (
    part.includes("LOWER LEG") ||
    target.includes("CALF") ||
    target.includes("GASTROCNEMIUS") ||
    target.includes("SOLEUS")
  )
    return "calves";
  if (part.includes("UPPER ARM")) {
    if (target.includes("BICEP")) return "biceps";
    if (target.includes("TRICEP")) return "triceps";
    return "shoulders";
  }
  if (part.includes("CARDIO")) return "cardio";
  if (part.includes("FULL") || target.includes("FULL")) return "full_body";
  return "other";
}

export async function syncExercisesFromExerciseDB(): Promise<{
  upserted: number;
  total: number;
}> {
  const baseUrl =
    process.env.EXERCISEDB_BASE_URL ?? "https://oss.exercisedb.dev/api/v1";
  const url = `${baseUrl}/exercises?limit=0`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new AppError(
      `ExerciseDB fetch failed: ${response.status} ${response.statusText}`,
      502,
    );
  }

  const payload = (await response.json()) as
    | ExerciseDBItem[]
    | { data: ExerciseDBItem[] };
  const source: ExerciseDBItem[] = Array.isArray(payload)
    ? payload
    : (payload as { data: ExerciseDBItem[] }).data;

  const admin = await sequelize.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'Admin' LIMIT 1`,
    { type: QueryTypes.SELECT },
  );
  if (!admin.length) throw new AppError("No Admin user found in DB", 500);
  const adminId = admin[0].id;

  const records = source
    .filter((ex) => !!ex.exerciseId)
    .map((ex) => ({
      name: ex.name,
      muscleGroup: mapMGFromEDB(ex.bodyParts ?? [], ex.targetMuscles ?? []),
      equipment: mapEqFromEDB(ex.equipments ?? []),
      primaryMuscles: (ex.targetMuscles ?? []).length ? ex.targetMuscles : null,
      secondaryMuscles: (ex.secondaryMuscles ?? []).length
        ? ex.secondaryMuscles
        : null,
      instructions: (ex.instructions ?? []).length
        ? ex.instructions.join("\n")
        : null,
      gifUrl:
        ex.gifUrl ??
        `${baseUrl}/image?exerciseId=${ex.exerciseId}&resolution=180`,
      externalDbId: ex.exerciseId,
      isActive: true,
      createdBy: adminId,
    }));

  await WellnessExercise.bulkCreate(records, {
    updateOnDuplicate: [
      "name",
      "muscleGroup",
      "equipment",
      "primaryMuscles",
      "secondaryMuscles",
      "instructions",
      "gifUrl",
    ],
    ignoreDuplicates: false,
  });

  return { upserted: records.length, total: source.length };
}

// ══════════════════════════════════════════
// WORKOUT TEMPLATES
// ══════════════════════════════════════════

export async function listTemplates(queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "name");
  const where: any = {};

  if (queryParams.category) where.category = queryParams.category;
  if (queryParams.active !== undefined)
    where.isActive = queryParams.active === "true";
  if (queryParams.search)
    where.name = { [Op.iLike]: `%${queryParams.search}%` };

  const { count, rows } = await WellnessWorkoutTemplate.findAndCountAll({
    where,
    limit,
    offset,
    order: [["name", "ASC"]],
    include: [
      {
        model: WellnessTemplateExercise,
        as: "exercises",
        include: [{ model: WellnessExercise, as: "exercise" }],
        order: [["orderIndex", "ASC"]],
        separate: true,
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getTemplate(id: string) {
  const template = await WellnessWorkoutTemplate.findByPk(id, {
    include: [
      {
        model: WellnessTemplateExercise,
        as: "exercises",
        include: [{ model: WellnessExercise, as: "exercise" }],
        order: [["orderIndex", "ASC"]],
        separate: true,
      },
    ],
  });
  if (!template) throw new AppError("Workout template not found", 404);
  return template;
}

export async function createTemplate(
  body: CreateTemplateInput,
  userId: string,
) {
  const tx = await sequelize.transaction();
  try {
    const template = await WellnessWorkoutTemplate.create(
      {
        name: body.name,
        nameAr: body.nameAr,
        description: body.description,
        category: body.category,
        estimatedMinutes: body.estimatedMinutes,
        createdBy: userId,
      } as any,
      { transaction: tx },
    );

    if (body.exercises?.length) {
      await WellnessTemplateExercise.bulkCreate(
        body.exercises.map((ex) => ({
          templateId: template.id,
          ...ex,
        })),
        { transaction: tx },
      );
    }

    await tx.commit();
    return getTemplate(template.id);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function updateTemplate(id: string, body: UpdateTemplateInput) {
  const template = await WellnessWorkoutTemplate.findByPk(id);
  if (!template) throw new AppError("Workout template not found", 404);

  const tx = await sequelize.transaction();
  try {
    const { exercises, ...templateFields } = body;
    if (Object.keys(templateFields).length > 0) {
      await template.update(templateFields, { transaction: tx });
    }

    if (exercises) {
      // Replace all exercises
      await WellnessTemplateExercise.destroy({
        where: { templateId: id },
        transaction: tx,
      });
      await WellnessTemplateExercise.bulkCreate(
        exercises.map((ex) => ({
          templateId: id,
          ...ex,
        })),
        { transaction: tx },
      );
    }

    await tx.commit();
    return getTemplate(id);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function deleteTemplate(id: string) {
  const template = await WellnessWorkoutTemplate.findByPk(id);
  if (!template) throw new AppError("Workout template not found", 404);
  await template.update({ isActive: false });
}

// ══════════════════════════════════════════
// WORKOUT ASSIGNMENTS
// ══════════════════════════════════════════

export async function listAssignments(queryParams: any) {
  const { limit, offset, page } = parsePagination(
    queryParams,
    "scheduled_date",
  );
  const where: any = {};

  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.date) where.assignedDate = queryParams.date;
  if (queryParams.from)
    where.assignedDate = { ...where.assignedDate, [Op.gte]: queryParams.from };
  if (queryParams.to)
    where.assignedDate = { ...where.assignedDate, [Op.lte]: queryParams.to };

  const { count, rows } = await WellnessWorkoutAssignment.findAndCountAll({
    where,
    limit,
    offset,
    order: [["assignedDate", "DESC"]],
    include: [
      {
        model: WellnessWorkoutTemplate,
        as: "template",
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getAssignment(id: string) {
  const assignment = await WellnessWorkoutAssignment.findByPk(id, {
    include: [
      {
        model: WellnessWorkoutTemplate,
        as: "template",
        include: [
          {
            model: WellnessTemplateExercise,
            as: "exercises",
            include: [{ model: WellnessExercise, as: "exercise" }],
            order: [["orderIndex", "ASC"]],
            separate: true,
          },
        ],
      },
    ],
  });
  if (!assignment) throw new AppError("Workout assignment not found", 404);
  return assignment;
}

export async function createAssignment(
  body: CreateAssignmentInput,
  userId: string,
) {
  // Verify template exists
  const template = await WellnessWorkoutTemplate.findByPk(body.templateId);
  if (!template) throw new AppError("Workout template not found", 404);

  return WellnessWorkoutAssignment.create({
    ...body,
    assignedBy: userId,
  } as any);
}

export async function updateAssignment(
  id: string,
  body: UpdateAssignmentInput,
) {
  const assignment = await WellnessWorkoutAssignment.findByPk(id);
  if (!assignment) throw new AppError("Workout assignment not found", 404);

  const updates: any = { ...body };
  if (body.status === "completed" && !assignment.completedAt) {
    updates.completedAt = new Date();
  }
  await assignment.update(updates);
  return assignment;
}

export async function deleteAssignment(id: string) {
  const assignment = await WellnessWorkoutAssignment.findByPk(id);
  if (!assignment) throw new AppError("Workout assignment not found", 404);
  await assignment.destroy();
}

export async function completeAssignment(id: string) {
  const assignment = await WellnessWorkoutAssignment.findByPk(id);
  if (!assignment) throw new AppError("Workout assignment not found", 404);

  await assignment.update({
    status: "completed",
    completedAt: new Date(),
  });

  return assignment;
}

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE
// ══════════════════════════════════════════

export async function getPlayerWorkouts(playerId: string, queryParams: any) {
  return listAssignments({ ...queryParams, playerId });
}
