import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule, authorize } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { z } from "zod";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import { getHub, getCompetitionMatches } from "./saudiLeagues.service";
import { runSingleCompetition } from "@cron/engines/saudiLeagues.engine";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /saudi-leagues/hub:
 *   get:
 *     summary: Saudi Leagues hub — all 19 competitions grouped by category
 *     tags: [Saudi Leagues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: season
 *         schema:
 *           type: string
 *         description: Season string e.g. "2025-2026" (defaults to current season)
 *     responses:
 *       200:
 *         description: Hub payload with 5 categories, 19 leagues, upcoming + recent fixtures
 */
router.get(
  "/hub",
  authorizeModule("matches", "read"),
  asyncHandler(async (req, res) => {
    const season =
      typeof req.query.season === "string" ? req.query.season : undefined;
    const data = await getHub(season);
    sendSuccess(res, data);
  }),
);

/**
 * @swagger
 * /saudi-leagues/competitions/{id}/matches:
 *   get:
 *     summary: Full match list for a single competition
 *     tags: [Saudi Leagues]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/competitions/:id/matches",
  authorizeModule("matches", "read"),
  validate(z.object({ id: z.string().uuid() }), "params"),
  asyncHandler(async (req, res) => {
    const season =
      typeof req.query.season === "string" ? req.query.season : undefined;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { data, meta } = await getCompetitionMatches(
      req.params.id,
      season,
      page,
      limit,
    );
    sendPaginated(res, data, meta);
  }),
);

/**
 * @swagger
 * /saudi-leagues/sync/{competitionId}:
 *   post:
 *     summary: Manually trigger a sync for a single competition (Admin only)
 *     tags: [Saudi Leagues]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/sync/:competitionId",
  authorize("Admin"),
  validate(z.object({ competitionId: z.string().uuid() }), "params"),
  asyncHandler(async (req, res) => {
    const season =
      typeof req.query.season === "string" ? req.query.season : undefined;
    const result = await runSingleCompetition(req.params.competitionId, season);
    sendSuccess(res, result, "Sync triggered successfully");
  }),
);

export default router;
