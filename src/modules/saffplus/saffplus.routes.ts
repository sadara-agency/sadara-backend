import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { syncLeaguesSchema } from "./saffplus.validation";
import * as ctrl from "./saffplus.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /saffplus/discover:
 *   get:
 *     summary: Discover SAFF+ platform info
 *     tags: [SAFF+]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform type, public key, nav pages
 */
router.get(
  "/discover",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.discover),
);

/**
 * @swagger
 * /saffplus/competitions:
 *   get:
 *     summary: List all competitions available on SAFF+
 *     tags: [SAFF+]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of competitions with id (slug) and name
 */
router.get(
  "/competitions",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listCompetitions),
);

/**
 * @swagger
 * /saffplus/clubs:
 *   get:
 *     summary: List all clubs available on SAFF+
 *     tags: [SAFF+]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of clubs with id (slug), name, and logo
 */
router.get(
  "/clubs",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listTeams),
);

/**
 * @swagger
 * /saffplus/competitions/{competitionId}/standings:
 *   get:
 *     summary: Get standings for a competition from SAFF+
 *     tags: [SAFF+]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Standings table
 */
router.get(
  "/competitions/:competitionId/standings",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listStandings),
);

/**
 * @swagger
 * /saffplus/competitions/{competitionId}/matches:
 *   get:
 *     summary: Get fixtures and results for a competition from SAFF+
 *     tags: [SAFF+]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of matches (upcoming and completed)
 */
router.get(
  "/competitions/:competitionId/matches",
  authorizeModule("saff-data", "read"),
  asyncHandler(ctrl.listMatches),
);

/**
 * @swagger
 * /saffplus/sync:
 *   post:
 *     summary: Sync Saudi league standings from SAFF+
 *     tags: [SAFF+]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               season:
 *                 type: string
 *                 example: "2024-2025"
 *               saffIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Sync result with source and record counts
 */
router.post(
  "/sync",
  authorizeModule("saff-data", "create"),
  validate(syncLeaguesSchema),
  asyncHandler(ctrl.syncLeagues),
);

export default router;
