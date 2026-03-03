// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.routes.ts
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createCourseSchema,
  updateCourseSchema,
  enrollPlayersSchema,
  updateEnrollmentSchema,
  trackActivitySchema,
  selfUpdateProgressSchema,
} from "./training.schema";
import * as ctrl from "./training.controller";

const router = Router();
router.use(authenticate);

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE (must come before :id catch-all)
// ══════════════════════════════════════════

// Player sees only their assigned courses
router.get("/my", asyncHandler(ctrl.myEnrollments));

// Player logs a content interaction (Clicked, VideoCompleted, etc.)
router.post(
  "/my/enrollments/:enrollmentId/track",
  validate(trackActivitySchema),
  asyncHandler(ctrl.trackMyActivity),
);

// Player self-updates progress
router.patch(
  "/my/enrollments/:enrollmentId/progress",
  validate(selfUpdateProgressSchema),
  asyncHandler(ctrl.updateMyProgress),
);

// ══════════════════════════════════════════
// ADMIN: Completion Matrix
// ══════════════════════════════════════════

router.get(
  "/admin/completion-matrix",
  authorize("Admin", "Manager"),
  asyncHandler(ctrl.completionMatrix),
);

// ══════════════════════════════════════════
// COURSES (Admin / Manager CRUD)
// ══════════════════════════════════════════

router.get("/", asyncHandler(ctrl.listCourses));
router.get("/player/:playerId", asyncHandler(ctrl.playerEnrollments));
router.get("/:id", asyncHandler(ctrl.getCourse));
router.post("/", validate(createCourseSchema), asyncHandler(ctrl.createCourse));
router.patch(
  "/:id",
  validate(updateCourseSchema),
  asyncHandler(ctrl.updateCourse),
);
router.delete(
  "/:id",
  authorize("Admin", "Manager"),
  asyncHandler(ctrl.deleteCourse),
);

// ══════════════════════════════════════════
// ENROLLMENTS (Admin manage)
// ══════════════════════════════════════════

router.post(
  "/:id/enroll",
  validate(enrollPlayersSchema),
  asyncHandler(ctrl.enrollPlayers),
);
router.patch(
  "/enrollments/:enrollmentId",
  validate(updateEnrollmentSchema),
  asyncHandler(ctrl.updateEnrollment),
);
router.delete(
  "/enrollments/:enrollmentId",
  asyncHandler(ctrl.removeEnrollment),
);

export default router;
