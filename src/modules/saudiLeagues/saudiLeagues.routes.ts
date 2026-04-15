// ─────────────────────────────────────────────────────────────
// src/modules/saudiLeagues/saudiLeagues.routes.ts
// Read-only routes for the Saudi Leagues hub.
// Exposes Saudi competitions from the shared competitions table.
// ─────────────────────────────────────────────────────────────

import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as svc from "@modules/saudiLeagues/saudiLeagues.service";
import { sendSuccess } from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import type { Response } from "express";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /saudi-leagues:
 *   get:
 *     summary: List all Saudi league competitions (flat list)
 *     tags: [Saudi Leagues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of Saudi competitions ordered by tier then name
 */
router.get(
  "/",
  authorizeModule("competitions", "read"),
  cacheRoute("saudi-leagues", CacheTTL.LONG),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, await svc.listSaudiLeagues());
  }),
);

/**
 * @swagger
 * /saudi-leagues/grouped:
 *   get:
 *     summary: Saudi leagues grouped by category (senior / cups / youth / grassroots)
 *     tags: [Saudi Leagues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of SaudiLeagueGroup objects
 */
router.get(
  "/grouped",
  authorizeModule("competitions", "read"),
  cacheRoute("saudi-leagues-grouped", CacheTTL.LONG),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, await svc.getSaudiLeaguesGrouped());
  }),
);

/**
 * @swagger
 * /saudi-leagues/{id}:
 *   get:
 *     summary: Get a single Saudi league competition
 *     tags: [Saudi Leagues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Competition object
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("competitions", "read"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    sendSuccess(res, await svc.getSaudiLeagueById(req.params.id));
  }),
);

export default router;
