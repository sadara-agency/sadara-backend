import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createAssignmentSchema,
  assignmentQuerySchema,
  myAssignmentQuerySchema,
  updateAssignmentStatusSchema,
} from "./playerCoachAssignment.validation";
import * as assignmentController from "./playerCoachAssignment.controller";

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("player-coach-assignments"));

/**
 * @swagger
 * /player-coach-assignments:
 *   get:
 *     summary: List player-coach assignments
 *     tags: [Player Coach Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: coachUserId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: specialty
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Assigned, Acknowledged, InProgress, Completed]
 *     responses:
 *       200:
 *         description: Paginated list with eager-loaded player and coachUser
 */
router.get(
  "/",
  authorizeModule("player-coach-assignments", "read"),
  validate(assignmentQuerySchema, "query"),
  asyncHandler(assignmentController.list),
);

/**
 * @swagger
 * /player-coach-assignments/me:
 *   get:
 *     summary: List the current user's assignments ("My Players")
 *     description: |
 *       Returns assignments where coachUserId = current user. Each row includes
 *       the player summary (name, photo, position) and the count of open tasks
 *       linked to the assignment. The single read API every portal uses for the
 *       My Assignments dashboard widget.
 *     tags: [Player Coach Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Assigned, Acknowledged, InProgress, Completed]
 *     responses:
 *       200: { description: Paginated list of MyAssignmentRow }
 */
router.get(
  "/me",
  validate(myAssignmentQuerySchema, "query"),
  asyncHandler(assignmentController.listMine),
);

/**
 * @swagger
 * /player-coach-assignments/{id}:
 *   get:
 *     summary: Get an assignment by ID
 *     tags: [Player Coach Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Assignment detail }
 *       404: { description: Not found }
 */
router.get(
  "/:id",
  authorizeModule("player-coach-assignments", "read"),
  asyncHandler(assignmentController.getById),
);

/**
 * @swagger
 * /player-coach-assignments:
 *   post:
 *     summary: Assign staff to a player with a specialty
 *     tags: [Player Coach Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, coachUserId, specialty]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               coachUserId: { type: string, format: uuid }
 *               specialty: { type: string }
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, critical]
 *               dueAt: { type: string, format: date-time }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Created — assignment created, notification + auto-task spawned for the assignee }
 *       404: { description: Player or staff user not found }
 *       409: { description: Person already in this player's working group }
 *       422: { description: Target user is a Player role }
 */
router.post(
  "/",
  authorizeModule("player-coach-assignments", "create"),
  validate(createAssignmentSchema),
  asyncHandler(assignmentController.create),
);

/**
 * @swagger
 * /player-coach-assignments/{id}/status:
 *   patch:
 *     summary: Update assignment lifecycle status
 *     description: |
 *       Moves an assignment through Assigned → Acknowledged → InProgress → Completed.
 *       Allowed for the assignee themselves or any Admin/Manager/Executive.
 *       On Acknowledged or Completed, leadership receives a notification.
 *     tags: [Player Coach Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Assigned, Acknowledged, InProgress, Completed]
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Not assignee or leadership }
 *       404: { description: Not found }
 *       422: { description: Illegal status transition }
 */
router.patch(
  "/:id/status",
  validate(updateAssignmentStatusSchema),
  asyncHandler(assignmentController.updateStatus),
);

/**
 * @swagger
 * /player-coach-assignments/{id}:
 *   delete:
 *     summary: Unassign staff from a player
 *     tags: [Player Coach Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete(
  "/:id",
  authorizeModule("player-coach-assignments", "delete"),
  asyncHandler(assignmentController.remove),
);

export default router;
