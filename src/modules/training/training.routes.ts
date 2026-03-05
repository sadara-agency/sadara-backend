// ═══════════════════════════════════════════════════════════════
// src/modules/training/training.routes.ts
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
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
router.get("/my", authorizeModule("training", "read"), asyncHandler(ctrl.myEnrollments));

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

// ══════════════════════════════════════════
// ADMIN: Completion Matrix
// ══════════════════════════════════════════

router.get(
  "/admin/completion-matrix",
  authorizeModule("training", "read"),
  asyncHandler(ctrl.completionMatrix),
);

// ══════════════════════════════════════════
// COURSES (Admin / Manager CRUD)
// ══════════════════════════════════════════

router.get("/", authorizeModule("training", "read"), asyncHandler(ctrl.listCourses));
router.get("/player/:playerId", authorizeModule("training", "read"), asyncHandler(ctrl.playerEnrollments));
router.get("/:id", authorizeModule("training", "read"), asyncHandler(ctrl.getCourse));
router.post("/", authorizeModule("training", "create"), validate(createCourseSchema), asyncHandler(ctrl.createCourse));
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
