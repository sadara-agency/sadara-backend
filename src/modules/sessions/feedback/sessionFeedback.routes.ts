import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authorizeModule } from "@middleware/auth";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { validate } from "@middleware/validate";
import {
  createSessionFeedbackSchema,
  updateSessionFeedbackSchema,
  feedbackQuerySchema,
} from "./sessionFeedback.validation";
import * as feedbackController from "./sessionFeedback.controller";

// Mounted under /api/v1/sessions — these routes use :sessionId param from parent
const router = Router({ mergeParams: true });

/**
 * @swagger
 * /sessions/{sessionId}/feedback:
 *   get:
 *     summary: List feedback for a session
 *     tags: [Session Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of feedback entries
 */
router.get(
  "/",
  authorizeModule("session-feedback", "read"),
  validate(feedbackQuerySchema, "query"),
  cacheRoute("session-feedback", CacheTTL.MEDIUM),
  asyncHandler(feedbackController.listBySession),
);

/**
 * @swagger
 * /sessions/{sessionId}/feedback/{feedbackId}:
 *   get:
 *     summary: Get a specific feedback entry
 *     tags: [Session Feedback]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:feedbackId",
  authorizeModule("session-feedback", "read"),
  cacheRoute("session-feedback", CacheTTL.MEDIUM),
  asyncHandler(feedbackController.getById),
);

/**
 * @swagger
 * /sessions/{sessionId}/feedback:
 *   post:
 *     summary: Submit feedback for a session
 *     tags: [Session Feedback]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  authorizeModule("session-feedback", "create"),
  validate(createSessionFeedbackSchema),
  asyncHandler(feedbackController.create),
);

/**
 * @swagger
 * /sessions/{sessionId}/feedback/{feedbackId}:
 *   patch:
 *     summary: Update feedback
 *     tags: [Session Feedback]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:feedbackId",
  authorizeModule("session-feedback", "update"),
  validate(updateSessionFeedbackSchema),
  asyncHandler(feedbackController.update),
);

/**
 * @swagger
 * /sessions/{sessionId}/feedback/{feedbackId}:
 *   delete:
 *     summary: Delete feedback
 *     tags: [Session Feedback]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:feedbackId",
  authorizeModule("session-feedback", "delete"),
  asyncHandler(feedbackController.remove),
);

export default router;
