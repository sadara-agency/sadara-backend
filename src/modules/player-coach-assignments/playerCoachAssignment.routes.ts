import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createAssignmentSchema,
  assignmentQuerySchema,
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
 *     description: |
 *       Multi-specialty coach assignments. Each row pairs a player with a coach user
 *       and a specialty (Coach, GymCoach, MentalCoach, etc.). Used by row-scope logic
 *       so specialty coaches can access data for players they're specifically assigned to,
 *       independent of the primary `players.coach_id`.
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
 *         schema:
 *           type: string
 *           enum: [Coach, SkillCoach, TacticalCoach, FitnessCoach, NutritionSpecialist, GymCoach, GoalkeeperCoach, MentalCoach]
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
 *     summary: Assign a coach to a player with a specialty
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
 *               specialty:
 *                 type: string
 *                 enum: [Coach, SkillCoach, TacticalCoach, FitnessCoach, NutritionSpecialist, GymCoach, GoalkeeperCoach, MentalCoach]
 *     responses:
 *       201: { description: Created }
 *       404: { description: Player or coach user not found }
 *       409: { description: Duplicate (player, coach, specialty) }
 *       422: { description: Target user is not a coach role }
 */
router.post(
  "/",
  authorizeModule("player-coach-assignments", "create"),
  validate(createAssignmentSchema),
  asyncHandler(assignmentController.create),
);

/**
 * @swagger
 * /player-coach-assignments/{id}:
 *   delete:
 *     summary: Unassign a coach from a player
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
