// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/fitness.service.ts
//
// Business logic for Phase 3: Exercises, Templates, Assignments,
// Workout Logging, Progressive Overload
// ═══════════════════════════════════════════════════════════════

import { Op } from "sequelize";
import { sequelize } from "@config/database";
import {
  WellnessExercise,
  WellnessWorkoutTemplate,
  WellnessTemplateExercise,
  WellnessWorkoutAssignment,
} from "./fitness.model";
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
        order: [["order_index", "ASC"]],
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
        order: [["order_index", "ASC"]],
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
  const { limit, offset, page } = parsePagination(queryParams, "assigned_date");
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
    order: [["assigned_date", "DESC"]],
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
            order: [["order_index", "ASC"]],
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
