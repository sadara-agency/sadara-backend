import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import { CachePrefix, CacheTTL } from "@shared/utils/cache";
import {
  createDesignSchema,
  updateDesignSchema,
  designQuerySchema,
  quickContentSchema,
  reviewNotesSchema,
  markPublishedSchema,
} from "./design.validation";
import * as designController from "./design.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /designs:
 *   get:
 *     summary: List content items (designs)
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Idea, Drafting, DesignNeeded, PendingApproval, Approved, Scheduled, Published, Postponed, Rejected]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Tweet, InstagramPost, Story, Reel, Video, PlayerAnnouncement, News, Thread, Design]
 *       - in: query
 *         name: scheduledDate
 *         schema: { type: string, format: date }
 *         description: Filter by scheduled date (YYYY-MM-DD) — used for Today's Publishing
 *       - in: query
 *         name: isLate
 *         schema: { type: boolean }
 *         description: Return overdue unpublished items
 *     responses:
 *       200:
 *         description: Paginated list
 */
router.get(
  "/",
  authorizeModule("designs", "read"),
  dynamicFieldAccess("designs"),
  validate(designQuerySchema, "query"),
  cacheRoute(CachePrefix.DESIGNS, CacheTTL.MEDIUM),
  asyncHandler(designController.list),
);

router.get(
  "/:id",
  authorizeModule("designs", "read"),
  dynamicFieldAccess("designs"),
  cacheRoute(CachePrefix.DESIGNS, CacheTTL.MEDIUM),
  asyncHandler(designController.getById),
);

/**
 * @swagger
 * /designs:
 *   post:
 *     summary: Create a content item
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  authorizeModule("designs", "create"),
  validate(createDesignSchema),
  asyncHandler(designController.create),
);

/**
 * @swagger
 * /designs/quick:
 *   post:
 *     summary: Quick Content — create in under a minute (5 required fields)
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/quick",
  authorizeModule("designs", "create"),
  validate(quickContentSchema),
  asyncHandler(designController.quickCreate),
);

router.patch(
  "/:id",
  authorizeModule("designs", "update"),
  validate(updateDesignSchema),
  asyncHandler(designController.update),
);

// ── Workflow transitions ──

/**
 * @swagger
 * /designs/{id}/submit-for-approval:
 *   post:
 *     summary: Submit content for approval → status = PendingApproval
 *     tags: [Designs]
 */
router.post(
  "/:id/submit-for-approval",
  authorizeModule("designs", "update"),
  asyncHandler(designController.submitForApproval),
);

/**
 * @swagger
 * /designs/{id}/approve:
 *   post:
 *     summary: Approve content → status = Approved
 *     tags: [Designs]
 */
router.post(
  "/:id/approve",
  authorizeModule("designs", "update"),
  asyncHandler(designController.approve),
);

/**
 * @swagger
 * /designs/{id}/request-changes:
 *   post:
 *     summary: Request edits → status = Drafting + reviewNotes required
 *     tags: [Designs]
 */
router.post(
  "/:id/request-changes",
  authorizeModule("designs", "update"),
  validate(reviewNotesSchema),
  asyncHandler(designController.requestChanges),
);

/**
 * @swagger
 * /designs/{id}/reject:
 *   post:
 *     summary: Reject content → status = Rejected + reviewNotes required
 *     tags: [Designs]
 */
router.post(
  "/:id/reject",
  authorizeModule("designs", "update"),
  validate(reviewNotesSchema),
  asyncHandler(designController.reject),
);

/**
 * @swagger
 * /designs/{id}/mark-published:
 *   post:
 *     summary: Mark as published → status = Published, stamps publishedAt
 *     tags: [Designs]
 */
router.post(
  "/:id/mark-published",
  authorizeModule("designs", "update"),
  validate(markPublishedSchema),
  asyncHandler(designController.markPublished),
);

/**
 * @swagger
 * /designs/{id}/postpone:
 *   post:
 *     summary: Postpone content → status = Postponed
 *     tags: [Designs]
 */
router.post(
  "/:id/postpone",
  authorizeModule("designs", "update"),
  asyncHandler(designController.postpone),
);

// ── Legacy alias ──
router.post(
  "/:id/publish",
  authorizeModule("designs", "update"),
  asyncHandler(designController.publish),
);

// ── Asset upload ──
router.post(
  "/:id/asset",
  authorizeModule("designs", "update"),
  (req, res, next) => {
    uploadSingle(req, res, (err: unknown) => {
      if (err) {
        const e = err as { code?: string; message?: string };
        const msg =
          e.code === "LIMIT_FILE_SIZE"
            ? "File too large. Maximum size is 25MB."
            : e.message || "Upload failed";
        return res.status(400).json({ success: false, message: msg });
      }
      next();
    });
  },
  verifyFileType,
  asyncHandler(designController.uploadAsset),
);

router.delete(
  "/:id",
  authorizeModule("designs", "delete"),
  asyncHandler(designController.remove),
);

export default router;
