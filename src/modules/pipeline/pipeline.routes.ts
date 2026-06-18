// ─────────────────────────────────────────────────────────────
// src/modules/pipeline/pipeline.routes.ts
// Mounted at /api/v1/pipeline.
// IMPORTANT: /sla-digest is registered BEFORE /:id to prevent
// Express matching the literal string as a UUID param.
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as pipelineController from "./pipeline.controller";
import {
  submitPlayerSchema,
  advancePhaseSchema,
  updateSubmissionSchema,
  getPipelineSchema,
} from "./pipeline.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /pipeline:
 *   get:
 *     summary: List pipeline submissions (Partner role sees only own submissions)
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated list of pipeline submissions
 */
router.get(
  "/",
  authorizeModule("pipeline", "read"),
  dynamicFieldAccess("pipeline"),
  cacheRoute("pipeline", CacheTTL.SHORT),
  asyncHandler(pipelineController.list),
);

/**
 * @swagger
 * /pipeline/sla-digest:
 *   get:
 *     summary: Get submissions breaching the 48-hour SLA in Compliance or Fit-or-Pass phase
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of SLA-breaching submissions
 */
router.get(
  "/sla-digest",
  authorizeModule("pipeline", "read"),
  asyncHandler(pipelineController.slaDigest),
);

/**
 * @swagger
 * /pipeline/{id}:
 *   get:
 *     summary: Get a single pipeline submission by ID
 *     tags: [Pipeline]
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
 *         description: Pipeline submission record
 *       404:
 *         description: Submission not found
 */
router.get(
  "/:id",
  authorizeModule("pipeline", "read"),
  validate(getPipelineSchema, "params"),
  dynamicFieldAccess("pipeline"),
  asyncHandler(pipelineController.getById),
);

/**
 * @swagger
 * /pipeline:
 *   post:
 *     summary: Submit a player into the pipeline
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Submission created
 *       404:
 *         description: Partner not found
 *       422:
 *         description: Partner is not active
 */
router.post(
  "/",
  authorizeModule("pipeline", "create"),
  validate(submitPlayerSchema),
  asyncHandler(pipelineController.create),
);

/**
 * @swagger
 * /pipeline/{id}/phase:
 *   patch:
 *     summary: Advance a submission to the next phase
 *     tags: [Pipeline]
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
 *         description: Phase advanced
 *       404:
 *         description: Submission not found
 */
router.patch(
  "/:id/phase",
  authorizeModule("pipeline", "update"),
  validate(advancePhaseSchema),
  asyncHandler(pipelineController.advancePhase),
);

/**
 * @swagger
 * /pipeline/{id}:
 *   patch:
 *     summary: Update a pipeline submission
 *     tags: [Pipeline]
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
 *         description: Submission updated
 */
router.patch(
  "/:id",
  authorizeModule("pipeline", "update"),
  validate(updateSubmissionSchema),
  asyncHandler(pipelineController.update),
);

/**
 * @swagger
 * /pipeline/{id}:
 *   delete:
 *     summary: Delete a pipeline submission
 *     tags: [Pipeline]
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
 *         description: Submission deleted
 */
router.delete(
  "/:id",
  authorizeModule("pipeline", "delete"),
  asyncHandler(pipelineController.remove),
);

export default router;
