// ─────────────────────────────────────────────────────────────
// src/modules/partners/partner.routes.ts
// Mounted at /api/v1/partners.
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as partnerController from "./partner.controller";
import {
  createPartnerSchema,
  updatePartnerSchema,
  getPartnerSchema,
} from "./partner.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /partners:
 *   get:
 *     summary: List all network partners visible to the current user
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of partners
 */
router.get(
  "/",
  authorizeModule("partners", "read"),
  dynamicFieldAccess("partners"),
  cacheRoute("partners", CacheTTL.MEDIUM),
  asyncHandler(partnerController.list),
);

/**
 * @swagger
 * /partners/{id}:
 *   get:
 *     summary: Get a single partner by ID
 *     tags: [Partners]
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
 *         description: Partner record
 *       404:
 *         description: Partner not found
 */
router.get(
  "/:id",
  authorizeModule("partners", "read"),
  validate(getPartnerSchema, "params"),
  dynamicFieldAccess("partners"),
  cacheRoute("partner", CacheTTL.MEDIUM),
  asyncHandler(partnerController.getById),
);

/**
 * @swagger
 * /partners:
 *   post:
 *     summary: Create a new network partner
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Partner created
 */
router.post(
  "/",
  authorizeModule("partners", "create"),
  validate(createPartnerSchema),
  asyncHandler(partnerController.create),
);

/**
 * @swagger
 * /partners/{id}:
 *   patch:
 *     summary: Update a network partner
 *     tags: [Partners]
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
 *         description: Partner updated
 */
router.patch(
  "/:id",
  authorizeModule("partners", "update"),
  validate(updatePartnerSchema),
  asyncHandler(partnerController.update),
);

/**
 * @swagger
 * /partners/{id}:
 *   delete:
 *     summary: Delete a network partner
 *     tags: [Partners]
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
 *       204:
 *         description: Partner deleted
 */
router.delete(
  "/:id",
  authorizeModule("partners", "delete"),
  asyncHandler(partnerController.remove),
);

export default router;
