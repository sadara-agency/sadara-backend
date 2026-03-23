// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.routes.ts
// ═══════════════════════════════════════════════════════════════

import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createProfileSchema,
  updateProfileSchema,
  createWeightLogSchema,
  createMyWeightLogSchema,
  createFoodItemSchema,
  createMealLogSchema,
  updateMealLogSchema,
  createMyMealLogSchema,
  copyDaySchema,
  copyMyDaySchema,
} from "./wellness.schema";
import * as ctrl from "./wellness.controller";

const router = Router();
router.use(authenticate);

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE (must come before :id / :playerId catch-all)
// ══════════════════════════════════════════

// Player views own profile & macros
router.get(
  "/my/profile",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myProfile),
);
router.get(
  "/my/macros",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myMacros),
);

// Player weight logging
router.get(
  "/my/weight",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myWeightLogs),
);
router.post(
  "/my/weight",
  authorizeModule("wellness", "create"),
  validate(createMyWeightLogSchema),
  asyncHandler(ctrl.createMyWeightLog),
);
router.get(
  "/my/weight/trend",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myWeightTrend),
);

// Player meal logging
router.get(
  "/my/meals",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myMealLogs),
);
router.post(
  "/my/meals",
  authorizeModule("wellness", "create"),
  validate(createMyMealLogSchema),
  asyncHandler(ctrl.createMyMealLog),
);
router.post(
  "/my/meals/copy-day",
  authorizeModule("wellness", "create"),
  validate(copyMyDaySchema),
  asyncHandler(ctrl.copyMyDay),
);
router.get(
  "/my/meals/daily-totals",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myDailyTotals),
);

// Player ring dashboard
router.get(
  "/my/dashboard",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.myDashboard),
);

// ══════════════════════════════════════════
// PROFILES (Coach / GymCoach / Admin)
// ══════════════════════════════════════════

router.get(
  "/profiles/:playerId",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.getProfile),
);
router.post(
  "/profiles",
  authorizeModule("wellness", "create"),
  validate(createProfileSchema),
  asyncHandler(ctrl.createProfile),
);
router.patch(
  "/profiles/:playerId",
  authorizeModule("wellness", "update"),
  validate(updateProfileSchema),
  asyncHandler(ctrl.updateProfile),
);
router.get(
  "/profiles/:playerId/macros",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.computeMacros),
);
router.post(
  "/profiles/:playerId/recalculate",
  authorizeModule("wellness", "update"),
  asyncHandler(ctrl.recalculateTargets),
);

// ══════════════════════════════════════════
// WEIGHT LOGS (Coach view per player)
// ══════════════════════════════════════════

router.get(
  "/weight/:playerId",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.listWeightLogs),
);
router.post(
  "/weight",
  authorizeModule("wellness", "create"),
  validate(createWeightLogSchema),
  asyncHandler(ctrl.createWeightLog),
);
router.get(
  "/weight/:playerId/trend",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.getWeightTrend),
);

// ══════════════════════════════════════════
// FOOD ITEMS
// ══════════════════════════════════════════

router.get(
  "/food/search",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.searchFoods),
);
router.get(
  "/food/:id",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.getFoodItem),
);
router.post(
  "/food",
  authorizeModule("wellness", "create"),
  validate(createFoodItemSchema),
  asyncHandler(ctrl.createFoodItem),
);

// ══════════════════════════════════════════
// MEAL LOGS (Coach view per player)
// ══════════════════════════════════════════

router.get(
  "/meals/:playerId",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.listMealLogs),
);
router.post(
  "/meals",
  authorizeModule("wellness", "create"),
  validate(createMealLogSchema),
  asyncHandler(ctrl.createMealLog),
);
router.patch(
  "/meals/:id",
  authorizeModule("wellness", "update"),
  validate(updateMealLogSchema),
  asyncHandler(ctrl.updateMealLog),
);
router.delete(
  "/meals/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.deleteMealLog),
);
router.post(
  "/meals/copy-day",
  authorizeModule("wellness", "create"),
  validate(copyDaySchema),
  asyncHandler(ctrl.copyDay),
);
router.get(
  "/meals/:playerId/daily-totals",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.getDailyTotals),
);

// ══════════════════════════════════════════
// DASHBOARD (Coach + Admin)
// ══════════════════════════════════════════

router.get(
  "/dashboard/overview",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.coachOverview),
);
router.get(
  "/dashboard/player/:playerId",
  authorizeModule("wellness", "read"),
  asyncHandler(ctrl.playerDashboard),
);

export default router;
