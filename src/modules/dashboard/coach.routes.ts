import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authorize } from "@middleware/auth";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as coachController from "@modules/dashboard/coach.controller";
import type { UserRole } from "@shared/types";

/**
 * Coach Dashboard sub-router — mounted at /dashboard/coach by dashboard.routes.ts.
 * `authenticate` is already applied by the parent router.
 *
 * Coach-specialty roles only (Admin gets in for support / portal-switching).
 */
const router = Router();

const COACH_ROLES: UserRole[] = [
  "Admin",
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GoalkeeperCoach",
  "MentalCoach",
];

router.get(
  "/kpi-strip",
  authorize(...COACH_ROLES),
  cacheRoute("dash", CacheTTL.SHORT, { perUser: true }),
  asyncHandler(coachController.getKpiStrip),
);

router.get(
  "/agenda",
  authorize(...COACH_ROLES),
  cacheRoute("dash", CacheTTL.SHORT, { perUser: true }),
  asyncHandler(coachController.getAgenda),
);

router.get(
  "/alerts",
  authorize(...COACH_ROLES),
  cacheRoute("dash", CacheTTL.SHORT, { perUser: true }),
  asyncHandler(coachController.getAlerts),
);

router.get(
  "/attendance-trend",
  authorize(...COACH_ROLES),
  cacheRoute("dash", CacheTTL.SHORT, { perUser: true }),
  asyncHandler(coachController.getAttendanceTrend),
);

router.get(
  "/task-velocity",
  authorize(...COACH_ROLES),
  cacheRoute("dash", CacheTTL.SHORT, { perUser: true }),
  asyncHandler(coachController.getTaskVelocity),
);

export default router;
