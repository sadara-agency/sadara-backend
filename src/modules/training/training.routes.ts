// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.routes.ts
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CachePrefix, CacheTTL } from "@shared/utils/cache";
import { uploadVideo } from "@middleware/upload";
import {
  createCourseSchema,
  updateCourseSchema,
  enrollPlayersSchema,
  updateEnrollmentSchema,
  trackActivitySchema,
  selfUpdateProgressSchema,
  createModuleSchema,
  updateModuleSchema,
  reorderSchema,
  createLessonSchema,
  updateLessonSchema,
  updateLessonProgressSchema,
  markLessonCompleteSchema,
} from "@modules/training/training.validation";
import * as ctrl from "@modules/training/training.controller";
import planRoutes from "@modules/training/plans/trainingPlan.routes";
import reviewRoutes from "@modules/training/reviews/devReview.routes";

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("training"));

// ── Sub-modules ──
// /api/v1/training/plans
router.use("/plans", planRoutes);
// /api/v1/training/reviews
router.use("/reviews", reviewRoutes);

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE (must come before :id catch-all)
// ══════════════════════════════════════════

// Player sees only their assigned courses
router.get(
  "/my",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.SHORT, { perUser: true }),
  asyncHandler(ctrl.myEnrollments),
);

// Player logs a content interaction (Clicked, VideoCompleted, etc.)
router.post(
  "/my/enrollments/:enrollmentId/track",
  authorizeModule("training", "create"),
  validate(trackActivitySchema),
  asyncHandler(ctrl.trackMyActivity),
);

// Player self-updates progress
router.patch(
  "/my/enrollments/:enrollmentId/progress",
  authorizeModule("training", "update"),
  validate(selfUpdateProgressSchema),
  asyncHandler(ctrl.updateMyProgress),
);

// Player gets per-lesson progress for an enrollment
router.get(
  "/my/enrollments/:enrollmentId/lessons",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.SHORT, { perUser: true }),
  asyncHandler(ctrl.getLessonProgress),
);

// Player updates video watch position (called every ~30s)
router.patch(
  "/my/enrollments/:enrollmentId/lessons/:lessonId/progress",
  authorizeModule("training", "update"),
  validate(updateLessonProgressSchema),
  asyncHandler(ctrl.updateLessonProgress),
);

// Player marks a non-video lesson as complete
router.post(
  "/my/enrollments/:enrollmentId/lessons/complete",
  authorizeModule("training", "update"),
  validate(markLessonCompleteSchema),
  asyncHandler(ctrl.markLessonComplete),
);

// ══════════════════════════════════════════
// ADMIN: Completion Matrix
// ══════════════════════════════════════════

router.get(
  "/admin/completion-matrix",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.SHORT),
  asyncHandler(ctrl.completionMatrix),
);

router.get(
  "/admin/analytics",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.SHORT),
  asyncHandler(ctrl.trainingAnalytics),
);

router.get(
  "/admin/leaderboard",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.SHORT),
  asyncHandler(ctrl.trainingLeaderboard),
);

// ══════════════════════════════════════════
// MODULES (under a course)
// ══════════════════════════════════════════

router.get(
  "/courses/:courseId/modules",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.MEDIUM),
  asyncHandler(ctrl.listModules),
);
router.post(
  "/courses/:courseId/modules",
  authorizeModule("training", "create"),
  validate(createModuleSchema),
  asyncHandler(ctrl.createModule),
);
router.patch(
  "/courses/:courseId/modules/reorder",
  authorizeModule("training", "update"),
  validate(reorderSchema),
  asyncHandler(ctrl.reorderModules),
);
router.patch(
  "/modules/:moduleId",
  authorizeModule("training", "update"),
  validate(updateModuleSchema),
  asyncHandler(ctrl.updateModule),
);
router.delete(
  "/modules/:moduleId",
  authorizeModule("training", "delete"),
  asyncHandler(ctrl.deleteModule),
);

// ══════════════════════════════════════════
// LESSONS (under a module)
// ══════════════════════════════════════════

router.post(
  "/modules/:moduleId/lessons",
  authorizeModule("training", "create"),
  validate(createLessonSchema),
  asyncHandler(ctrl.createLesson),
);
router.patch(
  "/modules/:moduleId/lessons/reorder",
  authorizeModule("training", "update"),
  validate(reorderSchema),
  asyncHandler(ctrl.reorderLessons),
);
router.patch(
  "/lessons/:lessonId",
  authorizeModule("training", "update"),
  validate(updateLessonSchema),
  asyncHandler(ctrl.updateLesson),
);
router.delete(
  "/lessons/:lessonId",
  authorizeModule("training", "delete"),
  asyncHandler(ctrl.deleteLesson),
);

// ══════════════════════════════════════════
// MEDIA (upload + stream)
// ══════════════════════════════════════════

router.post(
  "/lessons/:lessonId/upload",
  authorizeModule("training", "create"),
  uploadVideo,
  asyncHandler(ctrl.uploadLessonMedia),
);
router.get(
  "/media/:mediaId/stream",
  authorizeModule("training", "read"),
  asyncHandler(ctrl.streamMedia),
);

// ══════════════════════════════════════════
// COURSES (Admin / Manager CRUD)
// ══════════════════════════════════════════

router.get(
  "/",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.MEDIUM),
  asyncHandler(ctrl.listCourses),
);
router.get(
  "/player/:playerId",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.MEDIUM),
  asyncHandler(ctrl.playerEnrollments),
);
router.get(
  "/:id",
  authorizeModule("training", "read"),
  cacheRoute(CachePrefix.TRAINING, CacheTTL.MEDIUM),
  asyncHandler(ctrl.getCourse),
);
router.post(
  "/",
  authorizeModule("training", "create"),
  validate(createCourseSchema),
  asyncHandler(ctrl.createCourse),
);
router.patch(
  "/:id",
  authorizeModule("training", "update"),
  validate(updateCourseSchema),
  asyncHandler(ctrl.updateCourse),
);
router.delete(
  "/:id",
  authorizeModule("training", "delete"),
  asyncHandler(ctrl.deleteCourse),
);

// ══════════════════════════════════════════
// ENROLLMENTS (Admin manage)
// ══════════════════════════════════════════

router.post(
  "/:id/enroll",
  authorizeModule("training", "create"),
  authorizePlayerPackage("training", "create"),
  validate(enrollPlayersSchema),
  asyncHandler(ctrl.enrollPlayers),
);
router.patch(
  "/enrollments/:enrollmentId",
  authorizeModule("training", "update"),
  validate(updateEnrollmentSchema),
  asyncHandler(ctrl.updateEnrollment),
);
router.delete(
  "/enrollments/:enrollmentId",
  authorizeModule("training", "delete"),
  asyncHandler(ctrl.removeEnrollment),
);

export default router;
