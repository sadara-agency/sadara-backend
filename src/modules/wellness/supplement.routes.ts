import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./supplement.controller";
import {
  createSupplementSchema,
  updateSupplementSchema,
  listSupplementsQuerySchema,
  getSupplementSchema,
} from "./supplement.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /supplements:
 *   get:
 *     summary: List supplement entries (filterable by playerId, isActive)
 *     tags: [Supplements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated supplement list
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  cacheRoute("supplements", CacheTTL.MEDIUM),
  validate(listSupplementsQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /supplements/player/{playerId}:
 *   get:
 *     summary: Get all active supplements for a player
 *     tags: [Supplements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Supplement list for the player
 */
router.get(
  "/player/:playerId",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.listForPlayer),
);

/**
 * @swagger
 * /supplements/{id}:
 *   get:
 *     summary: Get a supplement entry by ID
 *     tags: [Supplements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Supplement entry
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  validate(getSupplementSchema, "params"),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /supplements:
 *   post:
 *     summary: Create a supplement entry for a player
 *     tags: [Supplements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSupplementDTO'
 *     responses:
 *       201:
 *         description: Supplement created
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(createSupplementSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /supplements/{id}:
 *   patch:
 *     summary: Update a supplement entry
 *     tags: [Supplements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Supplement updated
 *       404:
 *         description: Not found
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updateSupplementSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /supplements/{id}:
 *   delete:
 *     summary: Delete a supplement entry
 *     tags: [Supplements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Supplement deleted
 *       404:
 *         description: Not found
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
