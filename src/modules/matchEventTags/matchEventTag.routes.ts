import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL, CachePrefix } from "@shared/utils/cache";
import * as controller from "./matchEventTag.controller";
import {
  createEventTagSchema,
  listEventTagsSchema,
} from "./matchEventTag.validation";

// mergeParams so the nested :matchId from the parent mount is readable.
const router = Router({ mergeParams: true });
router.use(authenticate);

/**
 * @swagger
 * /matches/{matchId}/event-tags:
 *   get:
 *     summary: List analyst-created event tags for a match
 *     tags: [MatchEventTags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of event tags
 */
router.get(
  "/:matchId/event-tags",
  authorizeModule("matches", "read"),
  validate(listEventTagsSchema, "query"),
  cacheRoute(CachePrefix.MATCH_EVENT_TAGS, CacheTTL.SHORT),
  controller.listTags,
);

/**
 * @swagger
 * /matches/{matchId}/event-tags/summary:
 *   get:
 *     summary: Per-player aggregated event-tag counts for a match
 *     tags: [MatchEventTags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Per-player tag-type counts
 */
router.get(
  "/:matchId/event-tags/summary",
  authorizeModule("matches", "read"),
  cacheRoute(CachePrefix.MATCH_EVENT_TAGS, CacheTTL.SHORT),
  controller.getSummary,
);

/**
 * @swagger
 * /matches/{matchId}/event-tags:
 *   post:
 *     summary: Create an event tag at a video timestamp
 *     tags: [MatchEventTags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Event tag created
 */
router.post(
  "/:matchId/event-tags",
  authorizeModule("matches", "create"),
  validate(createEventTagSchema),
  controller.createTag,
);

router.delete(
  "/:matchId/event-tags/:tagId",
  authorizeModule("matches", "delete"),
  controller.deleteTag,
);

export default router;
