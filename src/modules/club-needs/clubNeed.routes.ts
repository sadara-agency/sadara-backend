import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createClubNeedSchema,
  updateClubNeedSchema,
  clubNeedQuerySchema,
} from "./clubNeed.validation";
import * as clubNeedController from "./clubNeed.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /club-needs:
 *   get:
 *     summary: List club positional needs
 *     tags: [Club Needs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: windowId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: clubId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [High, Medium, Low]
 *     responses:
 *       200:
 *         description: Paginated list with club and window eager-loaded
 */
router.get(
  "/",
  authorizeModule("club-needs", "read"),
  dynamicFieldAccess("club-needs"),
  validate(clubNeedQuerySchema, "query"),
  asyncHandler(clubNeedController.list),
);

/**
 * @swagger
 * /club-needs/{id}:
 *   get:
 *     summary: Get a club need by ID
 *     tags: [Club Needs]
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
 *         description: Club need detail with club and window
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  authorizeModule("club-needs", "read"),
  dynamicFieldAccess("club-needs"),
  asyncHandler(clubNeedController.getById),
);

/**
 * @swagger
 * /club-needs:
 *   post:
 *     summary: Create a club positional need
 *     tags: [Club Needs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clubId, windowId, position]
 *             properties:
 *               clubId:
 *                 type: string
 *                 format: uuid
 *               windowId:
 *                 type: string
 *                 format: uuid
 *               position:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 *       409:
 *         description: Duplicate (club, window, position) combination
 */
router.post(
  "/",
  authorizeModule("club-needs", "create"),
  validate(createClubNeedSchema),
  asyncHandler(clubNeedController.create),
);

/**
 * @swagger
 * /club-needs/{id}:
 *   patch:
 *     summary: Update a club need
 *     tags: [Club Needs]
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
  authorizeModule("club-needs", "update"),
  validate(updateClubNeedSchema),
  asyncHandler(clubNeedController.update),
);

/**
 * @swagger
 * /club-needs/{id}:
 *   delete:
 *     summary: Delete a club need
 *     tags: [Club Needs]
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
  authorizeModule("club-needs", "delete"),
  asyncHandler(clubNeedController.remove),
);

export default router;
