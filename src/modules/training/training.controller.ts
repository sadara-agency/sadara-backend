// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.controller.ts
// ═══════════════════════════════════════════════════════════════

import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import * as svc from "@modules/training/training.service";
import { logger } from "@config/logger";

const TRAINING_CACHES = [CachePrefix.TRAINING];

// ══════════════════════════════════════════
// COURSES (Admin)
// ══════════════════════════════════════════

export async function listCourses(req: AuthRequest, res: Response) {
  const result = await svc.listCourses(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getCourse(req: AuthRequest, res: Response) {
  const course = await svc.getCourseById(req.params.id);
  sendSuccess(res, course);
}

export async function createCourse(req: AuthRequest, res: Response) {
  const course = await svc.createCourse(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple(TRAINING_CACHES),
    logAudit(
      "CREATE",
      "training",
      course.id,
      buildAuditContext(req.user!, req.ip),
      `Created course: ${course.title}`,
    ),
  ]).catch(() => {});
  sendCreated(res, course);
}

export async function updateCourse(req: AuthRequest, res: Response) {
  const course = await svc.updateCourse(req.params.id, req.body);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, course, "Course updated");
}

export async function deleteCourse(req: AuthRequest, res: Response) {
  const result = await svc.deleteCourse(req.params.id);
  Promise.all([
    invalidateMultiple(TRAINING_CACHES),
    logAudit(
      "DELETE",
      "training",
      result.id,
      buildAuditContext(req.user!, req.ip),
      "Course deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result, "Course deleted");
}

// ══════════════════════════════════════════
// ENROLLMENTS (Admin)
// ══════════════════════════════════════════

export async function enrollPlayers(req: AuthRequest, res: Response) {
  const course = await svc.enrollPlayers(
    req.params.id,
    req.body.playerIds,
    req.user!.id,
  );
  Promise.all([
    invalidateMultiple(TRAINING_CACHES),
    logAudit(
      "UPDATE",
      "training",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      `Enrolled ${req.body.playerIds.length} players`,
    ),
  ]).catch(() => {});
  sendSuccess(res, course, "Players enrolled");
}

export async function updateEnrollment(req: AuthRequest, res: Response) {
  const enrollment = await svc.updateEnrollment(
    req.params.enrollmentId,
    req.body,
  );
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, enrollment, "Enrollment updated");
}

export async function removeEnrollment(req: AuthRequest, res: Response) {
  const result = await svc.removeEnrollment(req.params.enrollmentId);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, result, "Enrollment removed");
}

export async function playerEnrollments(req: AuthRequest, res: Response) {
  const enrollments = await svc.getPlayerEnrollments(req.params.playerId);
  sendSuccess(res, enrollments);
}

// ══════════════════════════════════════════
// ADMIN: Completion Matrix
// ══════════════════════════════════════════

export async function completionMatrix(req: AuthRequest, res: Response) {
  const data = await svc.getCompletionMatrix(req.query);
  sendSuccess(res, data);
}

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE (Portal)
// ══════════════════════════════════════════

export async function myEnrollments(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    logger.warn("[training] myEnrollments: playerId missing from JWT", {
      userId: req.user?.id,
      role: req.user?.role,
      email: req.user?.email,
    });
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const enrollments = await svc.getMyEnrollments(playerId);
  sendSuccess(res, enrollments);
}

export async function trackMyActivity(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }

  const result = await svc.trackActivity(
    req.params.enrollmentId,
    playerId,
    req.body,
  );

  Promise.all([
    invalidateMultiple(TRAINING_CACHES),
    logAudit(
      "UPDATE",
      "training",
      req.params.enrollmentId,
      buildAuditContext(req.user!, req.ip),
      `Player tracked: ${req.body.action} on enrollment ${req.params.enrollmentId}`,
    ),
  ]).catch(() => {});

  sendSuccess(res, result, "Activity tracked");
}

export async function updateMyProgress(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }

  const enrollment = await svc.selfUpdateProgress(
    req.params.enrollmentId,
    playerId,
    req.body,
  );

  sendSuccess(res, enrollment, "Progress updated");
}

// ══════════════════════════════════════════
// MODULES
// ══════════════════════════════════════════

export async function listModules(req: AuthRequest, res: Response) {
  const modules = await svc.listModules(req.params.courseId);
  sendSuccess(res, modules);
}

export async function createModule(req: AuthRequest, res: Response) {
  const mod = await svc.createModule(req.params.courseId, req.body);
  Promise.all([
    invalidateMultiple(TRAINING_CACHES),
    logAudit(
      "CREATE",
      "training_modules",
      mod.id,
      buildAuditContext(req.user!, req.ip),
      `Module created: ${mod.title}`,
    ),
  ]).catch(() => {});
  sendCreated(res, mod);
}

export async function updateModule(req: AuthRequest, res: Response) {
  const mod = await svc.updateModule(req.params.moduleId, req.body);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, mod);
}

export async function deleteModule(req: AuthRequest, res: Response) {
  const result = await svc.deleteModule(req.params.moduleId);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, result, "Module deleted");
}

export async function reorderModules(req: AuthRequest, res: Response) {
  await svc.reorderModules(req.params.courseId, req.body.orderedIds);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, null, "Modules reordered");
}

// ══════════════════════════════════════════
// LESSONS
// ══════════════════════════════════════════

export async function createLesson(req: AuthRequest, res: Response) {
  const lesson = await svc.createLesson(req.params.moduleId, req.body);
  Promise.all([
    invalidateMultiple(TRAINING_CACHES),
    logAudit(
      "CREATE",
      "training_lessons",
      lesson.id,
      buildAuditContext(req.user!, req.ip),
      `Lesson created: ${lesson.title}`,
    ),
  ]).catch(() => {});
  sendCreated(res, lesson);
}

export async function updateLesson(req: AuthRequest, res: Response) {
  const lesson = await svc.updateLesson(req.params.lessonId, req.body);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, lesson);
}

export async function deleteLesson(req: AuthRequest, res: Response) {
  const result = await svc.deleteLesson(req.params.lessonId);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, result, "Lesson deleted");
}

export async function reorderLessons(req: AuthRequest, res: Response) {
  await svc.reorderLessons(req.params.moduleId, req.body.orderedIds);
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, null, "Lessons reordered");
}

// ══════════════════════════════════════════
// MEDIA UPLOAD + STREAM
// ══════════════════════════════════════════

export async function uploadLessonMedia(req: AuthRequest, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file uploaded" });
    return;
  }
  const media = await svc.uploadLessonMedia(
    req.params.lessonId,
    req.file,
    req.user!.id,
  );
  Promise.all([
    invalidateMultiple(TRAINING_CACHES),
    logAudit(
      "CREATE",
      "training_media",
      media.id,
      buildAuditContext(req.user!, req.ip),
      `Media uploaded for lesson`,
    ),
  ]).catch(() => {});
  sendCreated(res, media);
}

export async function streamMedia(req: AuthRequest, res: Response) {
  const result = await svc.getMediaSignedUrl(req.params.mediaId);
  sendSuccess(res, result);
}

// ══════════════════════════════════════════
// LESSON PROGRESS
// ══════════════════════════════════════════

export async function getLessonProgress(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(400)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const progress = await svc.getLessonProgress(
    req.params.enrollmentId,
    playerId,
  );
  sendSuccess(res, progress);
}

export async function updateLessonProgress(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(400)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const progress = await svc.updateLessonProgress(
    req.params.enrollmentId,
    req.params.lessonId,
    playerId,
    req.body,
  );
  sendSuccess(res, progress);
}

export async function markLessonComplete(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(400)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const progress = await svc.markLessonComplete(
    req.params.enrollmentId,
    req.body.lessonId,
    playerId,
  );
  invalidateMultiple(TRAINING_CACHES).catch(() => {});
  sendSuccess(res, progress);
}

// ══════════════════════════════════════════
// TRAINING ANALYTICS
// ══════════════════════════════════════════

export async function trainingAnalytics(req: AuthRequest, res: Response) {
  const data = await svc.getTrainingAnalytics();
  sendSuccess(res, data);
}
