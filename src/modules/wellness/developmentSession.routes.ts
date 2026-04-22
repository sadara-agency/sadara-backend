import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./developmentSession.controller";
import {
  createSessionSchema,
  updateSessionSchema,
  completeSessionSchema,
  listSessionsQuerySchema,
} from "./developmentSession.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /development-sessions:
 *   get:
 *     summary: List all development sessions
 *     tags: [DevelopmentSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, completed, partial, skipped] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Paginated list of development sessions
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  validate(listSessionsQuerySchema, "query"),
  cacheRoute("development-sessions", CacheTTL.SHORT),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /development-sessions/player/{playerId}:
 *   get:
 *     summary: List sessions for a specific player
 *     tags: [DevelopmentSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of sessions for the player
 */
router.get(
  "/player/:playerId",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  validate(listSessionsQuerySchema, "query"),
  cacheRoute("development-sessions-player", CacheTTL.SHORT),
  asyncHandler(ctrl.listForPlayer),
);

/**
 * @swagger
 * /development-sessions/{id}:
 *   get:
 *     summary: Get a single development session by ID
 *     tags: [DevelopmentSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Development session detail
 *       404:
 *         description: Session not found
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  cacheRoute("development-session", CacheTTL.SHORT),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /development-sessions:
 *   post:
 *     summary: Schedule a new development session
 *     tags: [DevelopmentSessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, scheduledDate, sessionType]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               programId: { type: string, format: uuid }
 *               scheduledDate: { type: string, format: date }
 *               sessionType:
 *                 type: string
 *                 enum: [club_training, development_gym, development_field, rehab, recovery]
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Session created
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(createSessionSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /development-sessions/{id}:
 *   patch:
 *     summary: Update a development session
 *     tags: [DevelopmentSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session updated
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updateSessionSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /development-sessions/{id}:
 *   delete:
 *     summary: Delete a development session
 *     tags: [DevelopmentSessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session deleted
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

/**
 * @swagger
 * /development-sessions/{id}/complete:
 *   post:
 *     summary: Mark a session as completed (or partial/skipped)
 *     tags: [DevelopmentSessions]
 *     security:
 *       - bearerAuth: []
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
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [completed, partial, skipped]
 *               overallRpe: { type: number, minimum: 1, maximum: 10 }
 *               actualDurationMinutes: { type: integer }
 *               sessionNote: { type: string }
 *               completedAt: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Session completed
 *       422:
 *         description: Session already completed
 */
router.post(
  "/:id/complete",
  authorizeModule("wellness", "update"),
  validate(completeSessionSchema),
  asyncHandler(ctrl.complete),
);

export default router;
