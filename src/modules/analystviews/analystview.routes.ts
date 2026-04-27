// ─────────────────────────────────────────────────────────────
// src/modules/analystviews/analystview.routes.ts
// Mounted at /api/v1/analyst-views.
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as analystViewController from "@modules/analystviews/analystview.controller";
import {
  createAnalystViewSchema,
  updateAnalystViewSchema,
  analystViewIdParamSchema,
  analystViewQuerySchema,
} from "@modules/analystviews/analystview.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /analyst-views:
 *   get:
 *     summary: List saved analyst views visible to the current user
 *     tags: [AnalystViews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of analyst views
 */
router.get(
  "/",
  authorizeModule("analyst_views", "read"),
  validate(analystViewQuerySchema, "query"),
  dynamicFieldAccess("analyst_views"),
  cacheRoute("analyst_views", CacheTTL.SHORT, { perUser: true }),
  asyncHandler(analystViewController.list),
);

/**
 * @swagger
 * /analyst-views/{id}:
 *   get:
 *     summary: Get a single analyst view
 *     tags: [AnalystViews]
 */
router.get(
  "/:id",
  authorizeModule("analyst_views", "read"),
  validate(analystViewIdParamSchema, "params"),
  dynamicFieldAccess("analyst_views"),
  asyncHandler(analystViewController.getById),
);

/**
 * @swagger
 * /analyst-views:
 *   post:
 *     summary: Save the current page state as a named analyst view
 *     tags: [AnalystViews]
 */
router.post(
  "/",
  authorizeModule("analyst_views", "create"),
  validate(createAnalystViewSchema),
  asyncHandler(analystViewController.create),
);

/**
 * @swagger
 * /analyst-views/{id}:
 *   patch:
 *     summary: Update a saved analyst view (owner only)
 *     tags: [AnalystViews]
 */
router.patch(
  "/:id",
  authorizeModule("analyst_views", "update"),
  validate(analystViewIdParamSchema, "params"),
  validate(updateAnalystViewSchema),
  asyncHandler(analystViewController.update),
);

/**
 * @swagger
 * /analyst-views/{id}:
 *   delete:
 *     summary: Delete a saved analyst view (owner only)
 *     tags: [AnalystViews]
 */
router.delete(
  "/:id",
  authorizeModule("analyst_views", "delete"),
  validate(analystViewIdParamSchema, "params"),
  asyncHandler(analystViewController.remove),
);

/**
 * @swagger
 * /analyst-views/{id}/viewed:
 *   post:
 *     summary: Increment view counter and update last_viewed_at
 *     tags: [AnalystViews]
 */
router.post(
  "/:id/viewed",
  authorizeModule("analyst_views", "read"),
  validate(analystViewIdParamSchema, "params"),
  asyncHandler(analystViewController.markViewed),
);

export default router;
