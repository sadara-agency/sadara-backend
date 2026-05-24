import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { asyncHandler } from "@middleware/errorHandler";
import * as analystHomeController from "./analyst-home.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /analyst-home:
 *   get:
 *     summary: Analyst home dashboard aggregate
 *     description: Returns matches to analyze + players needing follow-up + KPI counts for the authenticated analyst's assigned players.
 *     tags: [AnalystHome]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analyst home data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     matchesToAnalyze:
 *                       type: array
 *                     playersNeedingFollowup:
 *                       type: array
 *                     counts:
 *                       type: object
 */
router.get(
  "/",
  authorizeModule("analyst-home", "read"),
  cacheRoute("analyst-home", CacheTTL.SHORT),
  asyncHandler(analystHomeController.getAnalystHome),
);

export default router;
