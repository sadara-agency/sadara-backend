import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { asyncHandler } from "@middleware/errorHandler";
import * as controller from "./staffMonitoring.controller";
import {
  rangeQuerySchema,
  rankingsQuerySchema,
  userIdParamSchema,
} from "./staffMonitoring.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /staff-monitoring/engagement:
 *   get:
 *     summary: Staff engagement summary (login count, active days, session hours)
 *     tags: [StaffMonitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [7d, 30d, 90d] }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of staff engagement rows
 */
router.get(
  "/engagement",
  authorizeModule("staffMonitoring", "read"),
  validate(rangeQuerySchema, "query"),
  cacheRoute("staff-mon-engagement", CacheTTL.MEDIUM),
  asyncHandler(controller.getEngagement),
);

/**
 * @swagger
 * /staff-monitoring/engagement/{userId}:
 *   get:
 *     summary: Detailed engagement for one staff member
 *     tags: [StaffMonitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [7d, 30d, 90d] }
 *     responses:
 *       200:
 *         description: Detailed engagement with daily hours and recent sessions
 */
router.get(
  "/engagement/:userId",
  authorizeModule("staffMonitoring", "read"),
  validate(userIdParamSchema, "params"),
  validate(rangeQuerySchema, "query"),
  cacheRoute("staff-mon-engagement-detail", CacheTTL.MEDIUM),
  asyncHandler(controller.getEngagementDetail),
);

/**
 * @swagger
 * /staff-monitoring/task-performance:
 *   get:
 *     summary: Task performance metrics per staff member
 *     tags: [StaffMonitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [7d, 30d, 90d] }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task performance rows
 */
router.get(
  "/task-performance",
  authorizeModule("staffMonitoring", "read"),
  validate(rangeQuerySchema, "query"),
  cacheRoute("staff-mon-task-perf", CacheTTL.MEDIUM),
  asyncHandler(controller.getTaskPerformance),
);

/**
 * @swagger
 * /staff-monitoring/rankings:
 *   get:
 *     summary: Staff KPI rankings with productivity, quality, and engagement sub-scores
 *     tags: [StaffMonitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [7d, 30d, 90d] }
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Ranked staff list with KPI scores
 */
router.get(
  "/rankings",
  authorizeModule("staffMonitoring", "read"),
  validate(rankingsQuerySchema, "query"),
  cacheRoute("staff-mon-rankings", CacheTTL.MEDIUM),
  asyncHandler(controller.getRankings),
);

/**
 * @swagger
 * /staff-monitoring/activity-heatmap/{userId}:
 *   get:
 *     summary: Activity heatmap (day of week × hour) derived from audit logs
 *     tags: [StaffMonitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [7d, 30d, 90d] }
 *     responses:
 *       200:
 *         description: Array of { dayOfWeek, hour, count } cells
 */
router.get(
  "/activity-heatmap/:userId",
  authorizeModule("staffMonitoring", "read"),
  validate(userIdParamSchema, "params"),
  validate(rangeQuerySchema, "query"),
  cacheRoute("staff-mon-heatmap", CacheTTL.MEDIUM),
  asyncHandler(controller.getActivityHeatmap),
);

export default router;
