import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as controller from "./matchEvaluation.controller";
import {
  createMatchEvaluationSchema,
  updateMatchEvaluationSchema,
  getMatchEvaluationSchema,
  listMatchEvaluationsQuerySchema,
  submitMatchEvaluationSchema,
  reviseMatchEvaluationSchema,
  createEvaluationReferralSchema,
} from "./matchEvaluation.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /match-evaluations:
 *   get:
 *     summary: List match evaluations
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Draft, PendingReview, Approved, NeedsRevision] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of evaluations
 */
router.get(
  "/",
  authorizeModule("matchEvaluations", "read"),
  dynamicFieldAccess("matchEvaluations"),
  validate(listMatchEvaluationsQuerySchema, "query"),
  cacheRoute("match-evaluations", CacheTTL.SHORT),
  controller.list,
);

/**
 * @swagger
 * /match-evaluations/{id}:
 *   get:
 *     summary: Get a single evaluation by ID
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Evaluation detail
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("matchEvaluations", "read"),
  dynamicFieldAccess("matchEvaluations"),
  validate(getMatchEvaluationSchema, "params"),
  controller.getById,
);

/**
 * @swagger
 * /match-evaluations/{id}/pdf:
 *   get:
 *     summary: Export evaluation as PDF
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 */
router.get(
  "/:id/pdf",
  authorizeModule("matchEvaluations", "read"),
  validate(getMatchEvaluationSchema, "params"),
  // PDF controller imported inline to avoid circular dep if pdf.controller imports service
  async (req, res, next) => {
    try {
      const { generateEvaluationPdf } =
        await import("./matchEvaluation.pdf.controller");
      return generateEvaluationPdf(req as any, res);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * @swagger
 * /match-evaluations:
 *   post:
 *     summary: Create a new draft evaluation
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchPlayerId, overallRating]
 *             properties:
 *               matchPlayerId:
 *                 type: string
 *                 format: uuid
 *               overallRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *     responses:
 *       201:
 *         description: Draft evaluation created
 *       409:
 *         description: Evaluation already exists for this match player
 */
router.post(
  "/",
  authorizeModule("matchEvaluations", "create"),
  validate(createMatchEvaluationSchema),
  controller.create,
);

/**
 * @swagger
 * /match-evaluations/{id}:
 *   patch:
 *     summary: Update a draft or needs-revision evaluation
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id",
  authorizeModule("matchEvaluations", "update"),
  validate(getMatchEvaluationSchema, "params"),
  validate(updateMatchEvaluationSchema),
  controller.update,
);

/**
 * @swagger
 * /match-evaluations/{id}/submit:
 *   post:
 *     summary: Submit evaluation for review (Draft → PendingReview)
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/submit",
  authorizeModule("matchEvaluations", "update"),
  validate(getMatchEvaluationSchema, "params"),
  validate(submitMatchEvaluationSchema),
  controller.submit,
);

/**
 * @swagger
 * /match-evaluations/{id}/approve:
 *   post:
 *     summary: Approve evaluation (PendingReview → Approved) — Manager/Admin only
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/approve",
  authorizeModule("matchEvaluations", "update"),
  validate(getMatchEvaluationSchema, "params"),
  controller.approve,
);

/**
 * @swagger
 * /match-evaluations/{id}/revise:
 *   post:
 *     summary: Request revision (PendingReview → NeedsRevision) — Manager/Admin only
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/revise",
  authorizeModule("matchEvaluations", "update"),
  validate(getMatchEvaluationSchema, "params"),
  validate(reviseMatchEvaluationSchema),
  controller.revise,
);

/**
 * @swagger
 * /match-evaluations/{id}/referral:
 *   post:
 *     summary: Create a referral from this evaluation
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/referral",
  authorizeModule("matchEvaluations", "update"),
  validate(getMatchEvaluationSchema, "params"),
  validate(createEvaluationReferralSchema),
  controller.createReferral,
);

/**
 * @swagger
 * /match-evaluations/{id}:
 *   delete:
 *     summary: Delete a draft evaluation
 *     tags: [MatchEvaluations]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  authorizeModule("matchEvaluations", "delete"),
  validate(getMatchEvaluationSchema, "params"),
  controller.remove,
);

export default router;
