import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CachePrefix, CacheTTL } from "@shared/utils/cache";
import {
  createDesignSchema,
  updateDesignSchema,
  designQuerySchema,
} from "./design.validation";
import * as designController from "./design.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /designs:
 *   get:
 *     summary: List graphic designs
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, in_progress, review, approved, published, archived]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [pre_match, post_match, profile_card, match_day_poster, social_post, motm, quote, milestone]
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list with player, match, club and creator eager-loaded
 */
router.get(
  "/",
  authorizeModule("designs", "read"),
  dynamicFieldAccess("designs"),
  validate(designQuerySchema, "query"),
  cacheRoute(CachePrefix.DESIGNS, CacheTTL.MEDIUM),
  asyncHandler(designController.list),
);

/**
 * @swagger
 * /designs/{id}:
 *   get:
 *     summary: Get a design by ID
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Design detail
 *       404:
 *         description: Not found
 */
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
 *     summary: Create a graphic design
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type]
 *             properties:
 *               title: { type: string }
 *               type: { type: string }
 *               format: { type: string }
 *               playerId: { type: string, format: uuid, nullable: true }
 *               matchId: { type: string, format: uuid, nullable: true }
 *               clubId: { type: string, format: uuid, nullable: true }
 *               description: { type: string, nullable: true }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Created
 *       404:
 *         description: Referenced player/match/club not found
 */
router.post(
  "/",
  authorizeModule("designs", "create"),
  validate(createDesignSchema),
  asyncHandler(designController.create),
);

/**
 * @swagger
 * /designs/{id}:
 *   patch:
 *     summary: Update a design
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 */
router.patch(
  "/:id",
  authorizeModule("designs", "update"),
  validate(updateDesignSchema),
  asyncHandler(designController.update),
);

/**
 * @swagger
 * /designs/{id}/publish:
 *   post:
 *     summary: Publish a design (sets status=published, stamps published_at)
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Published
 *       404:
 *         description: Not found
 *       422:
 *         description: Cannot publish without an asset
 */
router.post(
  "/:id/publish",
  authorizeModule("designs", "update"),
  asyncHandler(designController.publish),
);

/**
 * @swagger
 * /designs/{id}:
 *   delete:
 *     summary: Delete a design
 *     tags: [Designs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete(
  "/:id",
  authorizeModule("designs", "delete"),
  asyncHandler(designController.remove),
);

export default router;
