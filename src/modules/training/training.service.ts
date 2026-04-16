// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.service.ts
// ═══════════════════════════════════════════════════════════════

import { Op, Sequelize } from "sequelize";
import {
  TrainingCourse,
  TrainingEnrollment,
  TrainingActivity,
  TrainingMedia,
  TrainingModule,
  TrainingLesson,
  LessonProgress,
  type LessonType,
} from "@modules/training/training.model";
import { uploadFile, resolveFileUrl } from "@shared/utils/storage";
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
} from "@modules/training/training.validation";

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

// ═══════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════

export async function listModules(courseId: string) {
  return TrainingModule.findAll({
    where: { courseId },
    order: [
      ["sortOrder", "ASC"],
      [{ model: TrainingLesson, as: "lessons" }, "sortOrder", "ASC"],
    ],
    include: [
      {
        model: TrainingLesson,
        as: "lessons",
        include: [{ model: TrainingMedia, as: "media", required: false }],
      },
    ],
  });
}

export async function createModule(
  courseId: string,
  input: { title: string; titleAr?: string; description?: string },
) {
  await findOrThrow(TrainingCourse, courseId, "Course");
  const maxOrder = await TrainingModule.max("sortOrder", {
    where: { courseId },
  });
  return TrainingModule.create({
    courseId,
    ...input,
    sortOrder: ((maxOrder as number) ?? -1) + 1,
  });
}

export async function updateModule(
  moduleId: string,
  input: { title?: string; titleAr?: string; description?: string },
) {
  const mod = await findOrThrow(TrainingModule, moduleId, "Module");
  return mod.update(input);
}

export async function deleteModule(moduleId: string) {
  await destroyById(TrainingModule, moduleId, "Module");
  return { id: moduleId };
}

export async function reorderModules(courseId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      TrainingModule.update({ sortOrder: i }, { where: { id, courseId } }),
    ),
  );
}

// ═══════════════════════════════════════════
// LESSONS
// ═══════════════════════════════════════════

export async function createLesson(
  moduleId: string,
  input: {
    title: string;
    titleAr?: string;
    type?: LessonType;
    contentUrl?: string;
    durationSec?: number;
    isFree?: boolean;
  },
) {
  await findOrThrow(TrainingModule, moduleId, "Module");
  const maxOrder = await TrainingLesson.max("sortOrder", {
    where: { moduleId },
  });
  return TrainingLesson.create({
    moduleId,
    ...input,
    type: input.type ?? "video",
    sortOrder: ((maxOrder as number) ?? -1) + 1,
  });
}

export async function updateLesson(
  lessonId: string,
  input: {
    title?: string;
    titleAr?: string;
    type?: LessonType;
    contentUrl?: string;
    durationSec?: number;
    isFree?: boolean;
  },
) {
  const lesson = await findOrThrow(TrainingLesson, lessonId, "Lesson");
  return lesson.update(input);
}

export async function deleteLesson(lessonId: string) {
  await destroyById(TrainingLesson, lessonId, "Lesson");
  return { id: lessonId };
}

export async function reorderLessons(moduleId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) =>
      TrainingLesson.update({ sortOrder: i }, { where: { id, moduleId } }),
    ),
  );
}

// ═══════════════════════════════════════════
// MEDIA UPLOAD + STREAM
// ═══════════════════════════════════════════

export async function uploadLessonMedia(
  lessonId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
  userId: string,
) {
  const lesson = await findOrThrow(TrainingLesson, lessonId, "Lesson");
  const mod = await findOrThrow(TrainingModule, lesson.moduleId, "Module");

  const result = await uploadFile({
    folder: "training-media",
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    generateThumbnail: false,
  });

  const media = await TrainingMedia.create({
    courseId: mod.courseId,
    lessonId,
    type: file.mimetype.startsWith("video/") ? "video" : "document",
    title: lesson.title,
    titleAr: lesson.titleAr,
    storageProvider: "gcs",
    storagePath: result.key,
    durationSec: null,
    fileSizeMb: parseFloat((result.size / (1024 * 1024)).toFixed(2)),
    mimeType: result.mimeType,
    encodingStatus: "ready",
    createdBy: userId,
  } as any);

  // Link media to lesson
  await lesson.update({ mediaId: media.id });

  return media;
}

export async function getMediaSignedUrl(mediaId: string) {
  const media = await findOrThrow(TrainingMedia, mediaId, "Media");
  if (!media.storagePath) {
    throw new AppError("Media has no storage path", 400);
  }
  const url = await resolveFileUrl(media.storagePath, 180); // 3-hour expiry for long videos
  return { url, mimeType: media.mimeType, durationSec: media.durationSec };
}

// ═══════════════════════════════════════════
// LESSON PROGRESS (per-second tracking)
// ═══════════════════════════════════════════

const COMPLETION_THRESHOLD = 0.9; // 90% watched = complete

/**
 * Get all lesson progress for an enrollment (player sees their progress per lesson).
 */
export async function getLessonProgress(
  enrollmentId: string,
  playerId: string,
) {
  return LessonProgress.findAll({
    where: { enrollmentId, playerId },
    order: [["updatedAt", "DESC"]],
  });
}

/**
 * Update lesson watch position — called every ~30s by the video player.
 * Handles: upsert progress, auto-complete at 90%, recalculate course %.
 */
export async function updateLessonProgress(
  enrollmentId: string,
  lessonId: string,
  playerId: string,
  input: { position: number; duration: number },
) {
  const { position, duration } = input;

  // Upsert progress record
  const [progress] = await LessonProgress.upsert(
    {
      enrollmentId,
      lessonId,
      playerId,
      lastPosition: position,
      totalSeconds: duration,
      watchedSeconds: position, // Simple: position = furthest point watched
    },
    { returning: true },
  );

  // Auto-complete at 90%
  if (
    duration > 0 &&
    position / duration >= COMPLETION_THRESHOLD &&
    !progress.isCompleted
  ) {
    await progress.update({
      isCompleted: true,
      completedAt: new Date(),
      watchedSeconds: duration,
    });
  }

  // Recalculate course-level progress
  await recalculateCourseProgress(enrollmentId);

  return progress;
}

/**
 * Mark a non-video lesson (PDF, link, quiz) as complete.
 */
export async function markLessonComplete(
  enrollmentId: string,
  lessonId: string,
  playerId: string,
) {
  const [progress] = await LessonProgress.upsert(
    {
      enrollmentId,
      lessonId,
      playerId,
      isCompleted: true,
      completedAt: new Date(),
      watchedSeconds: 1,
      totalSeconds: 1,
      lastPosition: 1,
    },
    { returning: true },
  );

  await recalculateCourseProgress(enrollmentId);
  return progress;
}

/**
 * Recalculate enrollment.progressPct based on completed lessons / total lessons.
 */
async function recalculateCourseProgress(enrollmentId: string) {
  const enrollment = await TrainingEnrollment.findByPk(enrollmentId);
  if (!enrollment) return;

  // Count total lessons in the course
  const totalLessons = await TrainingLesson.count({
    include: [
      {
        model: TrainingModule,
        as: "module",
        where: { courseId: enrollment.courseId },
        attributes: [],
      },
    ],
  });

  if (totalLessons === 0) return;

  // Count completed lessons for this enrollment
  const completedLessons = await LessonProgress.count({
    where: { enrollmentId, isCompleted: true },
  });

  const pct = Math.round((completedLessons / totalLessons) * 100);

  const updates: any = { progressPct: pct };
  if (pct > 0 && enrollment.status === "NotStarted") {
    updates.status = "InProgress";
    updates.startedAt = new Date();
  }
  if (pct >= 100 && enrollment.status !== "Completed") {
    updates.status = "Completed";
    updates.completedAt = new Date();
  }

  await enrollment.update(updates);
}

// ═══════════════════════════════════════════
// TRAINING ANALYTICS (Admin dashboard)
// ═══════════════════════════════════════════

export async function getTrainingAnalytics() {
  const { sequelize: sq } = await import("@config/database");

  // 1. Overall KPIs
  const [totalCourses, totalEnrollments, totalCompleted, totalDropped] =
    await Promise.all([
      TrainingCourse.count({ where: { isActive: true } }),
      TrainingEnrollment.count(),
      TrainingEnrollment.count({ where: { status: "Completed" } }),
      TrainingEnrollment.count({ where: { status: "Dropped" } }),
    ]);

  const overallCompletionRate =
    totalEnrollments > 0
      ? Math.round((totalCompleted / totalEnrollments) * 100)
      : 0;

  // 2. Avg completion time (days from enrolledAt to completedAt)
  let avgCompletionDays = 0;
  try {
    const [result] = await sq.query<{ avg_days: string }>(
      `SELECT COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - enrolled_at)) / 86400)),
        0
      )::text as avg_days
      FROM training_enrollments
      WHERE status = 'Completed' AND completed_at IS NOT NULL`,
      { type: "SELECT" as any },
    );
    avgCompletionDays = parseInt((result as any)?.avg_days ?? "0", 10);
  } catch {
    avgCompletionDays = 0;
  }

  // 3. Total watch time (hours)
  let totalWatchHours = 0;
  try {
    const [result] = await sq.query<{ total_hours: string }>(
      `SELECT COALESCE(
        ROUND(SUM(watched_seconds) / 3600.0, 1),
        0
      )::text as total_hours
      FROM lesson_progress`,
      { type: "SELECT" as any },
    );
    totalWatchHours = parseFloat((result as any)?.total_hours ?? "0");
  } catch {
    totalWatchHours = 0;
  }

  // 4. Per-course completion rates
  const courseStatsRaw = await sq.query<{
    course_id: string;
    title: string;
    title_ar: string | null;
    enrolled: string;
    completed: string;
    in_progress: string;
    dropped: string;
    avg_progress: string;
  }>(
    `SELECT
      tc.id as course_id,
      tc.title,
      tc.title_ar,
      COUNT(te.id)::text as enrolled,
      COUNT(CASE WHEN te.status = 'Completed' THEN 1 END)::text as completed,
      COUNT(CASE WHEN te.status = 'InProgress' THEN 1 END)::text as in_progress,
      COUNT(CASE WHEN te.status = 'Dropped' THEN 1 END)::text as dropped,
      COALESCE(ROUND(AVG(te.progress_pct)), 0)::text as avg_progress
    FROM training_courses tc
    LEFT JOIN training_enrollments te ON te.course_id = tc.id
    WHERE tc.is_active = true
    GROUP BY tc.id, tc.title, tc.title_ar
    ORDER BY enrolled DESC`,
    { type: "SELECT" as any },
  );

  const courseStats = (courseStatsRaw as any[]).map((r) => ({
    courseId: r.course_id,
    title: r.title,
    titleAr: r.title_ar,
    enrolled: parseInt(r.enrolled, 10),
    completed: parseInt(r.completed, 10),
    inProgress: parseInt(r.in_progress, 10),
    dropped: parseInt(r.dropped, 10),
    avgProgress: parseInt(r.avg_progress, 10),
    completionRate:
      parseInt(r.enrolled, 10) > 0
        ? Math.round(
            (parseInt(r.completed, 10) / parseInt(r.enrolled, 10)) * 100,
          )
        : 0,
  }));

  // 5. Per-lesson watch rates (top lessons by watch time)
  const lessonStatsRaw = await sq.query<{
    lesson_id: string;
    title: string;
    title_ar: string | null;
    total_watches: string;
    completed_count: string;
    avg_watched_pct: string;
  }>(
    `SELECT
      tl.id as lesson_id,
      tl.title,
      tl.title_ar,
      COUNT(lp.id)::text as total_watches,
      COUNT(CASE WHEN lp.is_completed THEN 1 END)::text as completed_count,
      CASE WHEN AVG(lp.total_seconds) > 0
        THEN ROUND(AVG(lp.watched_seconds::decimal / NULLIF(lp.total_seconds, 0) * 100))::text
        ELSE '0'
      END as avg_watched_pct
    FROM training_lessons tl
    LEFT JOIN lesson_progress lp ON lp.lesson_id = tl.id
    GROUP BY tl.id, tl.title, tl.title_ar
    HAVING COUNT(lp.id) > 0
    ORDER BY total_watches DESC
    LIMIT 20`,
    { type: "SELECT" as any },
  );

  const lessonStats = (lessonStatsRaw as any[]).map((r) => ({
    lessonId: r.lesson_id,
    title: r.title,
    titleAr: r.title_ar,
    totalWatches: parseInt(r.total_watches, 10),
    completedCount: parseInt(r.completed_count, 10),
    avgWatchedPct: parseInt(r.avg_watched_pct, 10),
  }));

  // 6. Player engagement — top players by watch time
  const playerStatsRaw = await sq.query<{
    player_id: string;
    first_name: string;
    last_name: string;
    first_name_ar: string | null;
    last_name_ar: string | null;
    total_watch_sec: string;
    lessons_completed: string;
    courses_completed: string;
  }>(
    `SELECT
      p.id as player_id,
      p.first_name,
      p.last_name,
      p.first_name_ar,
      p.last_name_ar,
      COALESCE(SUM(lp.watched_seconds), 0)::text as total_watch_sec,
      COUNT(DISTINCT CASE WHEN lp.is_completed THEN lp.lesson_id END)::text as lessons_completed,
      COUNT(DISTINCT CASE WHEN te.status = 'Completed' THEN te.id END)::text as courses_completed
    FROM players p
    JOIN training_enrollments te ON te.player_id = p.id
    LEFT JOIN lesson_progress lp ON lp.player_id = p.id AND lp.enrollment_id = te.id
    GROUP BY p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar
    ORDER BY total_watch_sec DESC
    LIMIT 15`,
    { type: "SELECT" as any },
  );

  const playerStats = (playerStatsRaw as any[]).map((r) => ({
    playerId: r.player_id,
    name: `${r.first_name} ${r.last_name}`.trim(),
    nameAr: r.first_name_ar
      ? `${r.first_name_ar} ${r.last_name_ar || ""}`.trim()
      : null,
    totalWatchMinutes: Math.round(parseInt(r.total_watch_sec, 10) / 60),
    lessonsCompleted: parseInt(r.lessons_completed, 10),
    coursesCompleted: parseInt(r.courses_completed, 10),
  }));

  return {
    kpis: {
      totalCourses,
      totalEnrollments,
      totalCompleted,
      totalDropped,
      overallCompletionRate,
      avgCompletionDays,
      totalWatchHours,
    },
    courseStats,
    lessonStats,
    playerStats,
  };
}

// ── Training Leaderboard ──

export async function getLeaderboard(limit = 5) {
  const { sequelize: sq } = await import("@config/database");

  const rows = await sq.query<{
    player_id: string;
    first_name: string;
    last_name: string;
    first_name_ar: string | null;
    last_name_ar: string | null;
    photo_url: string | null;
    total_enrollments: string;
    completed_count: string;
    in_progress_count: string;
    has_expert: string;
    has_fast: string;
    has_on_fire: string;
  }>(
    `SELECT
       p.id AS player_id,
       p.first_name, p.last_name,
       p.first_name_ar, p.last_name_ar,
       p.photo_url,
       COUNT(te.id)::text AS total_enrollments,
       COUNT(CASE WHEN te.status = 'Completed' THEN 1 END)::text AS completed_count,
       COUNT(CASE WHEN te.status = 'InProgress' THEN 1 END)::text AS in_progress_count,
       MAX(CASE WHEN te.progress_pct >= 100 THEN 1 ELSE 0 END)::text AS has_expert,
       MAX(CASE
         WHEN te.status = 'Completed'
          AND te.completed_at IS NOT NULL
          AND te.enrolled_at IS NOT NULL
          AND EXTRACT(EPOCH FROM (te.completed_at - te.enrolled_at)) < 86400 * 7
         THEN 1 ELSE 0
       END)::text AS has_fast,
       MAX(CASE WHEN
         (SELECT COUNT(*) FROM training_enrollments te2
          WHERE te2.player_id = p.id AND te2.status = 'Completed') >= 3
         THEN 1 ELSE 0 END)::text AS has_on_fire
     FROM players p
     JOIN training_enrollments te ON te.player_id = p.id
     GROUP BY p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.photo_url
     HAVING COUNT(te.id) > 0
     ORDER BY
       (COUNT(CASE WHEN te.status = 'Completed' THEN 1 END) * 500
        + COUNT(CASE WHEN te.progress_pct >= 75 AND te.status != 'Completed' THEN 1 END) * 250
        + COUNT(CASE WHEN te.progress_pct >= 50 AND te.progress_pct < 75 THEN 1 END) * 100) DESC
     LIMIT :limit`,
    { replacements: { limit }, type: "SELECT" as any },
  );

  return (rows as any[]).map((r, i) => {
    const completedCount = parseInt(r.completed_count, 10);
    const totalEnrollments = parseInt(r.total_enrollments, 10);
    const inProgressCount = parseInt(r.in_progress_count, 10);

    const points =
      completedCount * 500 + inProgressCount * (inProgressCount > 0 ? 100 : 0);

    const badges: string[] = [];
    if (parseInt(r.has_expert, 10)) badges.push("expert");
    if (parseInt(r.has_fast, 10)) badges.push("fast_learner");
    if (parseInt(r.has_on_fire, 10)) badges.push("on_fire");

    return {
      rank: i + 1,
      playerId: r.player_id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      nameAr: r.first_name_ar
        ? `${r.first_name_ar} ${r.last_name_ar || ""}`.trim()
        : null,
      photoUrl: r.photo_url,
      points,
      completedCount,
      totalEnrollments,
      badges,
    };
  });
}
