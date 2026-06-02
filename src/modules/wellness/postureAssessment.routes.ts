import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./postureAssessment.controller";
import {
  createPostureAssessmentSchema,
  updatePostureAssessmentSchema,
  listPostureAssessmentsQuerySchema,
  getPostureAssessmentSchema,
  playerIdParamSchema,
} from "./postureAssessment.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /posture-assessments:
 *   get:
 *     summary: List posture assessments (filterable by playerId, date range)
 *     tags: [PostureAssessments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated posture assessment list
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  cacheRoute("posture-assessments", CacheTTL.MEDIUM),
  validate(listPostureAssessmentsQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /posture-assessments/player/{playerId}:
 *   get:
 *     summary: List all posture assessments for a player (newest first)
 *     tags: [PostureAssessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated posture assessments for the player
 */
router.get(
  "/player/:playerId",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  validate(playerIdParamSchema, "params"),
  validate(listPostureAssessmentsQuerySchema, "query"),
  asyncHandler(ctrl.listForPlayer),
);

/**
 * @swagger
 * /posture-assessments/player/{playerId}/latest:
 *   get:
 *     summary: Get the most recent posture assessment for a player
 *     tags: [PostureAssessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Latest posture assessment or null
 */
router.get(
  "/player/:playerId/latest",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  validate(playerIdParamSchema, "params"),
  asyncHandler(ctrl.getLatestForPlayer),
);

/**
 * @swagger
 * /posture-assessments/{id}:
 *   get:
 *     summary: Get a posture assessment by ID
 *     tags: [PostureAssessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Posture assessment
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  validate(getPostureAssessmentSchema, "params"),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /posture-assessments:
 *   post:
 *     summary: Record a new posture assessment for a player
 *     tags: [PostureAssessments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostureAssessmentDTO'
 *     responses:
 *       201:
 *         description: Posture assessment created
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(createPostureAssessmentSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /posture-assessments/{id}:
 *   patch:
 *     summary: Update a posture assessment
 *     tags: [PostureAssessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Posture assessment updated
 *       404:
 *         description: Not found
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updatePostureAssessmentSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /posture-assessments/{id}:
 *   delete:
 *     summary: Delete a posture assessment
 *     tags: [PostureAssessments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Posture assessment deleted
 *       404:
 *         description: Not found
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
