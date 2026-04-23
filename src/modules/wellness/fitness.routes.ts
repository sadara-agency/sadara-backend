// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/fitness.routes.ts
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createExerciseSchema,
  updateExerciseSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
} from "./wellness.validation";
import * as ctrl from "./fitness.controller";

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("wellness"));

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE (must come before :id catch-all)
// ══════════════════════════════════════════

router.get(
  "/my/workouts",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myWorkouts),
);
router.patch(
  "/my/workouts/:assignmentId/complete",
  authorizeModule("wellness", "update"),
  asyncHandler(ctrl.myCompleteWorkout),
);

// ══════════════════════════════════════════
// EXERCISES (Admin / GymCoach)
// ══════════════════════════════════════════

router.get(
  "/exercises",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.listExercises),
);
router.get(
  "/exercises/:id",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.getExercise),
);
router.post(
  "/exercises",
  authorizeModule("wellness", "create"),
  validate(createExerciseSchema),
  asyncHandler(ctrl.createExercise),
);
router.patch(
  "/exercises/:id",
  authorizeModule("wellness", "update"),
  validate(updateExerciseSchema),
  asyncHandler(ctrl.updateExercise),
);
router.delete(
  "/exercises/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.deleteExercise),
);

// ══════════════════════════════════════════
// WORKOUT TEMPLATES (Coach / GymCoach)
// ══════════════════════════════════════════

router.get(
  "/templates",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.listTemplates),
);
router.get(
  "/templates/:id",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.getTemplate),
);
router.post(
  "/templates",
  authorizeModule("wellness", "create"),
  validate(createTemplateSchema),
  asyncHandler(ctrl.createTemplate),
);
router.patch(
  "/templates/:id",
  authorizeModule("wellness", "update"),
  validate(updateTemplateSchema),
  asyncHandler(ctrl.updateTemplate),
);
router.delete(
  "/templates/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.deleteTemplate),
);

// ══════════════════════════════════════════
// WORKOUT ASSIGNMENTS (Coach / GymCoach)
// ══════════════════════════════════════════

router.get(
  "/assignments",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.listAssignments),
);
router.get(
  "/assignments/:id",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.getAssignment),
);
router.post(
  "/assignments",
  authorizeModule("wellness", "create"),
  validate(createAssignmentSchema),
  asyncHandler(ctrl.createAssignment),
);
router.patch(
  "/assignments/:id",
  authorizeModule("wellness", "update"),
  validate(updateAssignmentSchema),
  asyncHandler(ctrl.updateAssignment),
);
router.delete(
  "/assignments/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.deleteAssignment),
);

router.patch(
  "/assignments/:assignmentId/complete",
  authorizeModule("wellness", "update"),
  asyncHandler(ctrl.completeAssignment),
);

export default router;
