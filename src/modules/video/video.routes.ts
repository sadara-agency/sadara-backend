import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as videoController from "./video.controller";
import {
  createClipSchema,
  updateClipSchema,
  listClipsSchema,
  createTagSchema,
  updateTagSchema,
} from "./video.validation";

const router = Router();
router.use(authenticate);

// ── Clips ──

/**
 * @swagger
 * /video/clips:
 *   get:
 *     summary: List video clips
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: matchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: playerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of clips
 */
router.get(
  "/clips",
  authorizeModule("video", "read"),
  validate(listClipsSchema, "query"),
  cacheRoute("video-clips", CacheTTL.MEDIUM),
  videoController.listClips,
);

router.get(
  "/clips/:id",
  authorizeModule("video", "read"),
  videoController.getClip,
);

router.post(
  "/clips",
  authorizeModule("video", "create"),
  validate(createClipSchema),
  videoController.createClip,
);

router.patch(
  "/clips/:id",
  authorizeModule("video", "update"),
  validate(updateClipSchema),
  videoController.updateClip,
);

router.delete(
  "/clips/:id",
  authorizeModule("video", "delete"),
  videoController.deleteClip,
);

// ── Tags (nested under clips) ──

/**
 * @swagger
 * /video/clips/{clipId}/tags:
 *   get:
 *     summary: Get all tags for a clip
 *     tags: [Video]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clipId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of tags
 */
router.get(
  "/clips/:clipId/tags",
  authorizeModule("video", "read"),
  videoController.listTags,
);

router.get(
  "/clips/:clipId/tags/summary",
  authorizeModule("video", "read"),
  cacheRoute("video-tags-summary", CacheTTL.SHORT),
  videoController.getTagSummary,
);

router.post(
  "/clips/:clipId/tags",
  authorizeModule("video", "create"),
  validate(createTagSchema),
  videoController.createTag,
);

router.patch(
  "/clips/:clipId/tags/:tagId",
  authorizeModule("video", "update"),
  validate(updateTagSchema),
  videoController.updateTag,
);

router.delete(
  "/clips/:clipId/tags/:tagId",
  authorizeModule("video", "delete"),
  videoController.deleteTag,
);

export default router;
