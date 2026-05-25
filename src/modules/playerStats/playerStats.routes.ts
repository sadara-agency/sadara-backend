import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./playerStats.controller";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import {
  applyMatchToSeasonSchema,
  seasonStatsEditSchema,
  editHistoryQuerySchema,
  seasonParamSchema,
  playerIdParamSchema,
} from "./playerStats.validation";

const router = Router();
router.use(authenticate);

router.get(
  "/:playerId",
  authorizeModule("player-stats", "read"),
  validate(playerIdParamSchema, "params"),
  cacheRoute("player-season-stats", CacheTTL.MEDIUM),
  asyncHandler(ctrl.getAllSeasons),
);

/**
 * @swagger
 * /player-stats/{playerId}/history:
 *   get:
 *     summary: Change history (audit log) for a player's season stats
 *     tags: [PlayerStats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit entries
 */
router.get(
  "/:playerId/history",
  authorizeModule("player-stats", "read"),
  validate(playerIdParamSchema, "params"),
  dynamicFieldAccess("player-stats"),
  asyncHandler(ctrl.getHistory),
);

/**
 * @swagger
 * /player-stats/{playerId}/{season}/edit-history:
 *   get:
 *     summary: Immutable, paginated edit history for a player's season stats
 *     tags: [PlayerStats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: season
 *         required: true
 *         schema: { type: string, example: "2025-2026" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 20 }
 *       - in: query
 *         name: fieldName
 *         schema: { type: string, example: "goals" }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: isCorrection
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of stat-edit audit rows (one per changed field)
 */
router.get(
  "/:playerId/:season/edit-history",
  authorizeModule("player-stats", "read"),
  validate(seasonParamSchema, "params"),
  validate(editHistoryQuerySchema, "query"),
  asyncHandler(ctrl.getEditHistory),
);

router.get(
  "/:playerId/:season",
  authorizeModule("player-stats", "read"),
  validate(seasonParamSchema, "params"),
  cacheRoute("player-season-stats", CacheTTL.MEDIUM),
  asyncHandler(ctrl.getOneSeason),
);

/**
 * @swagger
 * /player-stats/{playerId}/{season}:
 *   put:
 *     summary: Accountable season-stats edit (justification required, optional match link)
 *     tags: [PlayerStats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [changes, justification]
 *             properties:
 *               changes:
 *                 type: object
 *                 additionalProperties: { type: number }
 *                 example: { goals: 12, assists: 5 }
 *               matchId:
 *                 type: string
 *                 format: uuid
 *               justification:
 *                 type: string
 *                 example: "Updated from official league stats sheet."
 *               isCorrection:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Updated season stats
 *       400:
 *         description: Validation failed — body includes error[] with field-level messages
 */
router.put(
  "/:playerId/:season",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  validate(seasonStatsEditSchema),
  asyncHandler(ctrl.editSeason),
);

router.post(
  "/:playerId/:season/recompute",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  asyncHandler(ctrl.recompute),
);

/**
 * @swagger
 * /player-stats/{playerId}/{season}/apply-match:
 *   post:
 *     summary: Record a match's stats and add them onto the season totals
 *     tags: [PlayerStats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Updated season stats
 */
router.post(
  "/:playerId/:season/apply-match",
  authorizeModule("player-stats", "update"),
  validate(seasonParamSchema, "params"),
  validate(applyMatchToSeasonSchema),
  asyncHandler(ctrl.applyMatch),
);

export default router;
