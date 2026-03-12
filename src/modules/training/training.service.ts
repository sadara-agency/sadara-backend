// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.service.ts
// ═══════════════════════════════════════════════════════════════

import { Op, Sequelize } from "sequelize";
import {
  TrainingCourse,
  TrainingEnrollment,
  TrainingActivity,
} from "@modules/training/training.model";
import { Player } from "@modules/players/player.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow, destroyById } from "@shared/utils/serviceHelpers";
import type {
  CreateCourseInput,
  UpdateCourseInput,
  UpdateEnrollmentInput,
  TrackActivityInput,
  SelfUpdateProgressInput,
} from "@modules/training/training.schema";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;

// Helper type for eager-loaded enrollment rows
type EnrollmentWithIncludes = TrainingEnrollment & {
  player?: InstanceType<typeof Player>;
  activities?: TrainingActivity[];
};

// ══════════════════════════════════════════
// COURSES (Admin)
// ══════════════════════════════════════════

export async function listCourses(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );
  const where: any = {};

  if (queryParams.category) where.category = queryParams.category;
  if (queryParams.isActive !== undefined)
    where.isActive = queryParams.isActive === "true";
  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { titleAr: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await TrainingCourse.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    attributes: {
      include: [
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM training_enrollments WHERE training_enrollments.course_id = "TrainingCourse".id)`,
          ),
          "enrollmentCount",
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM training_enrollments WHERE training_enrollments.course_id = "TrainingCourse".id AND training_enrollments.status = 'Completed')`,
          ),
          "completedCount",
        ],
      ],
    },
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getCourseById(id: string) {
  const course = await TrainingCourse.findByPk(id, {
    include: [
      {
        model: TrainingEnrollment,
        as: "enrollments",
        include: [
          { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
          {
            model: TrainingActivity,
            as: "activities",
            attributes: ["id", "action", "createdAt"],
            required: false,
          },
        ],
      },
    ],
  });
  if (!course) throw new AppError("Course not found", 404);
  return course;
}

export async function createCourse(
  input: CreateCourseInput,
  createdBy: string,
) {
  return TrainingCourse.create({ ...input, createdBy } as any);
}

export async function updateCourse(id: string, input: UpdateCourseInput) {
  const course = await findOrThrow(TrainingCourse, id, "Course");
  return course.update(input as any);
}

export async function deleteCourse(id: string) {
  return destroyById(TrainingCourse, id, "Course");
}

// ══════════════════════════════════════════
// ENROLLMENTS (Admin)
// ══════════════════════════════════════════

export async function enrollPlayers(
  courseId: string,
  playerIds: string[],
  assignedBy: string,
) {
  await findOrThrow(TrainingCourse, courseId, "Course");

  const existing = await Player.findAll({
    where: { id: { [Op.in]: playerIds } },
    attributes: ["id"],
  });
  if (existing.length !== playerIds.length) {
    throw new AppError("Some players not found", 404);
  }

  const records = playerIds.map((playerId) => ({
    courseId,
    playerId,
    assignedBy,
  }));

  await TrainingEnrollment.bulkCreate(records as any, {
    updateOnDuplicate: ["assignedBy", "updatedAt"],
  });

  return getCourseById(courseId);
}

export async function updateEnrollment(
  enrollmentId: string,
  input: UpdateEnrollmentInput,
) {
  const enrollment = await findOrThrow(
    TrainingEnrollment,
    enrollmentId,
    "Enrollment",
  );

  const updates: any = { ...input };

  if (input.status === "InProgress" && !enrollment.startedAt) {
    updates.startedAt = new Date();
  }
  if (input.status === "Completed") {
    updates.completedAt = new Date();
    updates.progressPct = 100;
  }

  return enrollment.update(updates);
}

export async function removeEnrollment(enrollmentId: string) {
  return destroyById(TrainingEnrollment, enrollmentId, "Enrollment");
}

export async function getPlayerEnrollments(playerId: string) {
  return TrainingEnrollment.findAll({
    where: { playerId },
    include: [{ model: TrainingCourse, as: "course" }],
    order: [["enrolledAt", "DESC"]],
  });
}

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE (Portal)
// ══════════════════════════════════════════

/**
 * GET /training/my — player sees only courses assigned to them
 * Returns enriched enrollments with course data + activity log
 */
export async function getMyEnrollments(playerId: string) {
  if (!playerId) throw new AppError("Player account not linked", 403);

  const enrollments = await TrainingEnrollment.findAll({
    where: { playerId },
    include: [
      {
        model: TrainingCourse,
        as: "course",
        attributes: [
          "id",
          "title",
          "titleAr",
          "description",
          "descriptionAr",
          "contentType",
          "contentUrl",
          "category",
          "difficulty",
          "durationHours",
          "isActive",
        ],
      },
      {
        model: TrainingActivity,
        as: "activities",
        attributes: ["id", "action", "metadata", "createdAt"],
        required: false,
      },
    ],
    order: [["enrolledAt", "DESC"]],
  });

  return enrollments;
}

/**
 * POST /training/my/enrollments/:enrollmentId/track
 * Logs a content interaction + auto-transitions enrollment status
 */
export async function trackActivity(
  enrollmentId: string,
  playerId: string,
  input: TrackActivityInput,
) {
  const enrollment = await findOrThrow(
    TrainingEnrollment,
    enrollmentId,
    "Enrollment",
  );

  // Security: player can only track their own enrollments
  if (enrollment.playerId !== playerId) {
    throw new AppError("Forbidden — not your enrollment", 403);
  }

  // Create the activity record
  const activity = await TrainingActivity.create({
    enrollmentId,
    playerId,
    courseId: enrollment.courseId,
    action: input.action,
    metadata: input.metadata ?? null,
  } as any);

  // ── Auto-transition enrollment status based on action ──

  const updates: Record<string, unknown> = {};

  // Clicked / VideoStarted → move from NotStarted → InProgress
  if (
    ["Clicked", "VideoStarted", "Viewed"].includes(input.action) &&
    enrollment.status === "NotStarted"
  ) {
    updates.status = "InProgress";
    updates.startedAt = new Date();
  }

  // VideoCompleted → mark as Completed with 100% progress
  if (input.action === "VideoCompleted") {
    updates.status = "Completed";
    updates.completedAt = new Date();
    updates.progressPct = 100;
  }

  // Apply status transition if any
  if (Object.keys(updates).length > 0) {
    await enrollment.update(updates);
  }

  return { activity, enrollment: await enrollment.reload() };
}

/**
 * PATCH /training/my/enrollments/:enrollmentId/progress
 * Player self-updates progress percentage or notes
 */
export async function selfUpdateProgress(
  enrollmentId: string,
  playerId: string,
  input: SelfUpdateProgressInput,
) {
  const enrollment = await findOrThrow(
    TrainingEnrollment,
    enrollmentId,
    "Enrollment",
  );
  if (enrollment.playerId !== playerId) {
    throw new AppError("Forbidden — not your enrollment", 403);
  }

  const updates: Record<string, unknown> = {};

  if (input.progressPct !== undefined) {
    updates.progressPct = input.progressPct;

    // Auto-start if setting progress > 0
    if (input.progressPct > 0 && enrollment.status === "NotStarted") {
      updates.status = "InProgress";
      updates.startedAt = new Date();
    }

    // Auto-complete at 100%
    if (input.progressPct >= 100) {
      updates.status = "Completed";
      updates.completedAt = new Date();
    }
  }

  if (input.notes !== undefined) {
    updates.notes = input.notes;
  }

  return enrollment.update(updates);
}

// ══════════════════════════════════════════
// ADMIN: Completion Matrix
// ══════════════════════════════════════════

/**
 * GET /training/admin/completion-matrix
 * Returns all courses × all enrolled players with status
 */
export async function getCompletionMatrix(queryParams: any) {
  const { search } = queryParams;

  // Get all active courses
  const courseWhere: any = { isActive: true };
  if (search) {
    courseWhere[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { titleAr: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const courses = await TrainingCourse.findAll({
    where: courseWhere,
    attributes: ["id", "title", "titleAr", "category", "difficulty"],
    order: [["title", "ASC"]],
  });

  // Get all enrollments grouped by player
  const enrollments = (await TrainingEnrollment.findAll({
    where: { courseId: { [Op.in]: courses.map((c) => c.id) } },
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      {
        model: TrainingActivity,
        as: "activities",
        attributes: ["action", "createdAt"],
        required: false,
      },
    ],
    order: [["enrolledAt", "ASC"]],
  })) as EnrollmentWithIncludes[];

  // Build player → course → enrollment map
  const playerMap = new Map<
    string,
    {
      player: EnrollmentWithIncludes["player"];
      courses: Map<
        string,
        { status: string; progressPct: number; lastActivity: string | null }
      >;
    }
  >();

  for (const e of enrollments) {
    const pId = e.playerId;
    if (!playerMap.has(pId)) {
      playerMap.set(pId, {
        player: e.player,
        courses: new Map(),
      });
    }

    const activities = (e.activities ?? []) as unknown as {
      action: string;
      createdAt: Date;
    }[];
    const lastAct =
      activities.length > 0
        ? activities
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0]
            .createdAt.toISOString()
        : null;

    playerMap.get(pId)!.courses.set(e.courseId, {
      status: e.status,
      progressPct: e.progressPct,
      lastActivity: lastAct,
    });
  }

  // Flatten into response
  const players = Array.from(playerMap.entries()).map(([playerId, data]) => ({
    player: data.player,
    completions: courses.map((c) => ({
      courseId: c.id,
      ...(data.courses.get(c.id) ?? {
        status: "NotEnrolled",
        progressPct: 0,
        lastActivity: null,
      }),
    })),
  }));

  return { courses, players };
}
