import { Router } from "express";
import { authenticate, authorize } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { asyncHandler } from "@middleware/errorHandler";
import { submitProfileChangeSchema } from "./profileChangeRequest.validation";
import * as controller from "./profileChangeRequest.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /profile-change-requests:
 *   post:
 *     summary: Submit a player profile change for leadership approval
 *     description: >
 *       Player-only. Submits whitelisted profile fields (height, weight, date of
 *       birth, preferred foot, position) as a change request. Approval/rejection
 *       is handled via the existing /approvals endpoints by leadership roles.
 *     tags: [ProfileChangeRequests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Submitted for approval
 *       409:
 *         description: A profile change is already awaiting approval
 *       422:
 *         description: No changes to submit
 */
router.post(
  "/",
  authorize("Player"),
  validate(submitProfileChangeSchema),
  asyncHandler(controller.submit),
);

/**
 * @swagger
 * /profile-change-requests/mine:
 *   get:
 *     summary: List the calling player's profile-change requests
 *     description: Player-only. Returns the player's 20 most recent requests, newest first.
 *     tags: [ProfileChangeRequests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of the player's profile-change requests
 */
router.get("/mine", authorize("Player"), asyncHandler(controller.listMine));

export default router;
