import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./nutritionPrescription.controller";
import {
  issuePrescriptionSchema,
  updatePrescriptionSchema,
  reissuePrescriptionSchema,
  listPrescriptionsQuerySchema,
} from "./nutritionPrescription.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /nutrition-prescriptions:
 *   get:
 *     summary: List nutrition prescriptions
 *     tags: [NutritionPrescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: currentOnly
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated prescription list
 */
router.get(
  "/",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  cacheRoute("nutrition-prescriptions", CacheTTL.SHORT),
  validate(listPrescriptionsQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

/**
 * @swagger
 * /nutrition-prescriptions/player/{playerId}/current:
 *   get:
 *     summary: Get active (non-superseded) prescription for a player
 *     tags: [NutritionPrescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Current prescription or null
 */
router.get(
  "/player/:playerId/current",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.getCurrent),
);

/**
 * @swagger
 * /nutrition-prescriptions/player/{playerId}/history:
 *   get:
 *     summary: Get full version history for a player's prescriptions
 *     tags: [NutritionPrescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: All prescription versions ordered newest first
 */
router.get(
  "/player/:playerId/history",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.getHistory),
);

/**
 * @swagger
 * /nutrition-prescriptions/{id}:
 *   get:
 *     summary: Get prescription by ID
 *     tags: [NutritionPrescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Prescription record
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.getById),
);

/**
 * @swagger
 * /nutrition-prescriptions:
 *   post:
 *     summary: Issue a new prescription (version 1)
 *     tags: [NutritionPrescriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IssuePrescriptionDTO'
 *     responses:
 *       201:
 *         description: Prescription created
 *       409:
 *         description: Player already has an active prescription
 */
router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(issuePrescriptionSchema),
  asyncHandler(ctrl.create),
);

/**
 * @swagger
 * /nutrition-prescriptions/player/{playerId}/reissue:
 *   post:
 *     summary: Create a new version of the current prescription
 *     tags: [NutritionPrescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReissuePrescriptionDTO'
 *     responses:
 *       201:
 *         description: New version issued
 *       200:
 *         description: No current prescription to reissue
 */
router.post(
  "/player/:playerId/reissue",
  authorizeModule("wellness", "create"),
  validate(reissuePrescriptionSchema),
  asyncHandler(ctrl.reissue),
);

/**
 * @swagger
 * /nutrition-prescriptions/{id}:
 *   patch:
 *     summary: Update current prescription
 *     tags: [NutritionPrescriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated prescription
 *       422:
 *         description: Cannot update a superseded prescription
 */
router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updatePrescriptionSchema),
  asyncHandler(ctrl.update),
);

/**
 * @swagger
 * /nutrition-prescriptions/{id}:
 *   delete:
 *     summary: Delete a prescription
 *     tags: [NutritionPrescriptions]
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
 *       422:
 *         description: Cannot delete a superseded prescription
 */
router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
