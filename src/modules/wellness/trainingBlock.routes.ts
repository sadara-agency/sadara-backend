import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule, authorize } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./trainingBlock.controller";
import {
  openBlockSchema,
  updateBlockSchema,
  closeBlockSchema,
  pauseBlockSchema,
  listBlocksQuerySchema,
  getBlockSchema,
  getPlayerBlocksSchema,
} from "./trainingBlock.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /training-blocks:
 *   get:
 *     tags: [TrainingBlocks]
 *     summary: List all training blocks (admin/coach view)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, paused, closed] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated list of training blocks }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  validate(listBlocksQuerySchema, "query"),
  dynamicFieldAccess("wellness"),
  cacheRoute("training-blocks", CacheTTL.MEDIUM),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /training-blocks/player/{playerId}:
 *   get:
 *     tags: [TrainingBlocks]
 *     summary: List training blocks for a specific player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Paginated training blocks for the player }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/player/:playerId",
  authorizeModule("wellness", "read"),
  authorizePlayerPackage("wellness", "read"),
  validate(getPlayerBlocksSchema, "params"),
  validate(listBlocksQuerySchema, "query"),
  dynamicFieldAccess("wellness"),
  cacheRoute("training-blocks-player", CacheTTL.MEDIUM),
  asyncHandler(ctrl.listForPlayer),
);

/**
 * @swagger
 * /training-blocks/player/{playerId}/active:
 *   get:
 *     tags: [TrainingBlocks]
 *     summary: Get the active training block for a player (null if none)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Active block or null }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get(
  "/player/:playerId/active",
  authorizeModule("wellness", "read"),
  authorizePlayerPackage("wellness", "read"),
  validate(getPlayerBlocksSchema, "params"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.getActive),
);

/**
 * @swagger
 * /training-blocks/{id}:
 *   get:
 *     tags: [TrainingBlocks]
 *     summary: Get a single training block by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Training block detail }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Training block not found }
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  validate(getBlockSchema, "params"),
  dynamicFieldAccess("wellness"),
  cacheRoute("training-block", CacheTTL.MEDIUM),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /training-blocks:
 *   post:
 *     tags: [TrainingBlocks]
 *     summary: Open a new training block for a player
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OpenBlockDTO'
 *     responses:
 *       201: { description: Training block opened }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       409: { description: Player already has an active training block }
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(openBlockSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /training-blocks/{id}:
 *   patch:
 *     tags: [TrainingBlocks]
 *     summary: Update a training block (non-status fields only)
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
 *             $ref: '#/components/schemas/UpdateBlockDTO'
 *     responses:
 *       200: { description: Training block updated }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Training block not found }
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updateBlockSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /training-blocks/{id}:
 *   delete:
 *     tags: [TrainingBlocks]
 *     summary: Hard-delete a training block (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Training block deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Training block not found }
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  authorize("Admin"),
  asyncHandler(ctrl.remove),
);

/**
 * @swagger
 * /training-blocks/{id}/pause:
 *   post:
 *     tags: [TrainingBlocks]
 *     summary: Pause an active training block
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Training block paused }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Training block not found }
 *       422: { description: Block is not active }
 */
router.post(
  "/:id/pause",
  authorizeModule("wellness", "update"),
  validate(pauseBlockSchema),
  asyncHandler(ctrl.pause),
);

/**
 * @swagger
 * /training-blocks/{id}/resume:
 *   post:
 *     tags: [TrainingBlocks]
 *     summary: Resume a paused training block
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Training block resumed }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Training block not found }
 *       409: { description: Player already has an active block }
 *       422: { description: Block is not paused }
 */
router.post(
  "/:id/resume",
  authorizeModule("wellness", "update"),
  asyncHandler(ctrl.resume),
);

/**
 * @swagger
 * /training-blocks/{id}/close:
 *   post:
 *     tags: [TrainingBlocks]
 *     summary: Close a training block
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CloseBlockDTO'
 *     responses:
 *       200: { description: Training block closed }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Training block not found }
 *       422: { description: Block is already closed }
 */
router.post(
  "/:id/close",
  authorizeModule("wellness", "update"),
  validate(closeBlockSchema),
  asyncHandler(ctrl.close),
);

/**
 * @swagger
 * /training-blocks/{id}/report:
 *   get:
 *     tags: [TrainingBlocks]
 *     summary: Get block progress report (Phase 6)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Block report with body comp delta, checkin aggregates, session stats, weight trend }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Training block not found }
 */
router.get(
  "/:id/report",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  cacheRoute("block-report", CacheTTL.SHORT),
  asyncHandler(ctrl.getReport),
);

export default router;
