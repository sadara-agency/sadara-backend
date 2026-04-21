import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createTransferWindowSchema,
  updateTransferWindowSchema,
  transferWindowQuerySchema,
} from "./transferWindow.validation";
import * as transferWindowController from "./transferWindow.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /transfer-windows:
 *   get:
 *     summary: List all transfer windows
 *     tags: [Transfer Windows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Upcoming, Active, Closed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of transfer windows
 */
router.get(
  "/",
  authorizeModule("transfer-windows", "read"),
  dynamicFieldAccess("transfer-windows"),
  validate(transferWindowQuerySchema, "query"),
  asyncHandler(transferWindowController.list),
);

/**
 * @swagger
 * /transfer-windows/{id}:
 *   get:
 *     summary: Get a transfer window by ID
 *     tags: [Transfer Windows]
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
 *         description: Transfer window detail
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("transfer-windows", "read"),
  dynamicFieldAccess("transfer-windows"),
  asyncHandler(transferWindowController.getById),
);

/**
 * @swagger
 * /transfer-windows:
 *   post:
 *     summary: Create a transfer window
 *     tags: [Transfer Windows]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [season, startDate, endDate]
 *             properties:
 *               season:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Season already exists
 */
router.post(
  "/",
  authorizeModule("transfer-windows", "create"),
  validate(createTransferWindowSchema),
  asyncHandler(transferWindowController.create),
);

/**
 * @swagger
 * /transfer-windows/{id}:
 *   patch:
 *     summary: Update a transfer window
 *     tags: [Transfer Windows]
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
 *         description: Updated
 *       404:
 *         description: Not found
 */
router.patch(
  "/:id",
  authorizeModule("transfer-windows", "update"),
  validate(updateTransferWindowSchema),
  asyncHandler(transferWindowController.update),
);

/**
 * @swagger
 * /transfer-windows/{id}:
 *   delete:
 *     summary: Delete a transfer window (cascades club_needs)
 *     tags: [Transfer Windows]
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
 *         description: Deleted
 *       404:
 *         description: Not found
 */
router.delete(
  "/:id",
  authorizeModule("transfer-windows", "delete"),
  asyncHandler(transferWindowController.remove),
);

export default router;
