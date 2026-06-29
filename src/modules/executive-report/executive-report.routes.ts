import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CachePrefix, CacheTTL } from "@shared/utils/cache";
import {
  executiveReportParamsSchema,
  executiveReportQuerySchema,
} from "@modules/executive-report/executive-report.validation";
import * as ctrl from "@modules/executive-report/executive-report.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /executive-reports/{playerId}:
 *   get:
 *     summary: Executive decision brief for a player (leadership only)
 *     tags: [ExecutiveReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: locale
 *         schema: { type: string, enum: [ar, en], default: ar }
 *     responses:
 *       200:
 *         description: Executive report payload (data + bilingual narrative)
 *       403:
 *         description: Caller lacks executive-reports read permission
 *       404:
 *         description: Player not found
 */
router.get(
  "/:playerId",
  authorizeModule("executive-reports", "read"),
  validate(executiveReportParamsSchema, "params"),
  validate(executiveReportQuerySchema, "query"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.SHORT),
  asyncHandler(ctrl.getReport),
);

/**
 * @swagger
 * /executive-reports/{playerId}/pdf:
 *   get:
 *     summary: Download the executive decision brief as a branded PDF
 *     tags: [ExecutiveReports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: locale
 *         schema: { type: string, enum: [ar, en], default: ar }
 *     responses:
 *       200:
 *         description: PDF file (application/pdf)
 *       403:
 *         description: Caller lacks executive-reports read permission
 */
router.get(
  "/:playerId/pdf",
  authorizeModule("executive-reports", "read"),
  validate(executiveReportParamsSchema, "params"),
  validate(executiveReportQuerySchema, "query"),
  asyncHandler(ctrl.downloadPdf),
);

export default router;
