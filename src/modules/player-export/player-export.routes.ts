import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { exportPlayerSchema } from "./player-export.validation";
import { exportPlayer, exportPlayerData } from "./player-export.controller";

const router = Router({ mergeParams: true });

router.use(authenticate);

/**
 * @swagger
 * /players/{id}/export:
 *   post:
 *     summary: Export a player's profile to PDF / XLSX / CSV / HTML
 *     tags: [Players]
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
 *             required: [sections, format]
 *             properties:
 *               sections:
 *                 type: array
 *                 items: { type: string, enum: [personal, stats, contracts, injuries, training, sessions, wellness, reports, finance, documents, notes, offers] }
 *               format: { type: string, enum: [pdf, xlsx, csv, html] }
 *               locale: { type: string, enum: [en, ar] }
 *     responses:
 *       200:
 *         description: Binary file
 *         content:
 *           application/pdf: {}
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet: {}
 *           text/csv: {}
 *           text/html: {}
 */
router.post(
  "/:id/export",
  authorizeModule("players", "read"),
  validate(exportPlayerSchema),
  asyncHandler(exportPlayer),
);

/**
 * @swagger
 * /players/{id}/export-data:
 *   get:
 *     summary: Get aggregated player data for client-side PDF rendering
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sections
 *         schema: { type: string }
 *         description: Comma-separated section keys
 *       - in: query
 *         name: locale
 *         schema: { type: string, enum: [en, ar] }
 *     responses:
 *       200:
 *         description: Aggregated player export data
 */
router.get(
  "/:id/export-data",
  authorizeModule("players", "read"),
  asyncHandler(exportPlayerData),
);

export default router;
