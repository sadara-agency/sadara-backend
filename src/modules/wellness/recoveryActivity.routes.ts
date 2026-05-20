import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./recoveryActivity.controller";
import {
  createRecoveryActivitySchema,
  updateRecoveryActivitySchema,
  listRecoveryActivityQuerySchema,
  getRecoveryActivitySchema,
} from "./recoveryActivity.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /recovery-activities/my/today:
 *   get:
 *     tags: [RecoveryActivities]
 *     summary: Today's recovery totals for the authenticated player
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Today's recovery summary (or null) }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/my/today",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.myToday),
);

/**
 * @swagger
 * /recovery-activities/my/recent:
 *   get:
 *     tags: [RecoveryActivities]
 *     summary: Recent recovery activities for the authenticated player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated recent recovery activities }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/my/recent",
  authorizeModule("wellness", "read"),
  validate(listRecoveryActivityQuerySchema, "query"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.myRecent),
);

/**
 * @swagger
 * /recovery-activities:
 *   get:
 *     tags: [RecoveryActivities]
 *     summary: List all recovery activities (admin/coach view)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated list of recovery activities }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  validate(listRecoveryActivityQuerySchema, "query"),
  dynamicFieldAccess("wellness"),
  cacheRoute("recovery-activities", CacheTTL.MEDIUM),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /recovery-activities/{id}:
 *   get:
 *     tags: [RecoveryActivities]
 *     summary: Get a single recovery activity by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Recovery activity detail }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Recovery activity not found }
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  validate(getRecoveryActivitySchema, "params"),
  dynamicFieldAccess("wellness"),
  cacheRoute("recovery-activity", CacheTTL.MEDIUM),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /recovery-activities:
 *   post:
 *     tags: [RecoveryActivities]
 *     summary: Record a new recovery activity
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRecoveryActivityDTO'
 *     responses:
 *       201: { description: Recovery activity created }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       409: { description: Recovery activity already exists for this date }
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(createRecoveryActivitySchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /recovery-activities/{id}:
 *   patch:
 *     tags: [RecoveryActivities]
 *     summary: Update a recovery activity
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRecoveryActivityDTO'
 *     responses:
 *       200: { description: Recovery activity updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Recovery activity not found }
 *       409: { description: Recovery activity already exists for this date }
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updateRecoveryActivitySchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /recovery-activities/{id}:
 *   delete:
 *     tags: [RecoveryActivities]
 *     summary: Delete a recovery activity
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Recovery activity deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Recovery activity not found }
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
