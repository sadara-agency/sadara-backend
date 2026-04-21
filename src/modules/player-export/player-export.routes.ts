import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { exportPlayerSchema } from "./player-export.validation";
import { exportPlayer } from "./player-export.controller";

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

export default router;
