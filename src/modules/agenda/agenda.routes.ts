import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { asyncHandler } from "@middleware/errorHandler";
import * as agendaController from "./agenda.controller";
import {
  createGoalSchema,
  updateGoalSchema,
  getGoalSchema,
  listGoalsQuerySchema,
  createTaskSchema,
  updateTaskSchema,
  getTaskSchema,
  listTasksQuerySchema,
  rolloverDecisionSchema,
} from "./agenda.validation";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /agenda/goals:
 *   get:
 *     summary: List personal agenda goals
 *     tags: [Agenda]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/goals",
  authorizeModule("agenda", "read"),
  validate(listGoalsQuerySchema, "query"),
  cacheRoute("agenda-goals", CacheTTL.SHORT),
  asyncHandler(agendaController.listGoals),
);

/**
 * @swagger
 * /agenda/goals/{id}:
 *   get:
 *     summary: Get a single goal with progress
 *     tags: [Agenda]
 */
router.get(
  "/goals/:id",
  authorizeModule("agenda", "read"),
  validate(getGoalSchema, "params"),
  asyncHandler(agendaController.getGoal),
);

/**
 * @swagger
 * /agenda/goals:
 *   post:
 *     summary: Create a new monthly goal
 *     tags: [Agenda]
 */
router.post(
  "/goals",
  authorizeModule("agenda", "create"),
  validate(createGoalSchema),
  asyncHandler(agendaController.createGoal),
);

/**
 * @swagger
 * /agenda/goals/{id}:
 *   patch:
 *     summary: Update a goal
 *     tags: [Agenda]
 */
router.patch(
  "/goals/:id",
  authorizeModule("agenda", "update"),
  validate(updateGoalSchema),
  asyncHandler(agendaController.updateGoal),
);

/**
 * @swagger
 * /agenda/goals/{id}:
 *   delete:
 *     summary: Delete a goal (tasks become standalone)
 *     tags: [Agenda]
 */
router.delete(
  "/goals/:id",
  authorizeModule("agenda", "delete"),
  validate(getGoalSchema, "params"),
  asyncHandler(agendaController.deleteGoal),
);

// ── Today & Greet ──

/**
 * @swagger
 * /agenda/today:
 *   get:
 *     summary: Get today's tasks + pending rollover decisions
 *     tags: [Agenda]
 */
router.get(
  "/today",
  authorizeModule("agenda", "read"),
  asyncHandler(agendaController.getToday),
);

/**
 * @swagger
 * /agenda/should-greet:
 *   get:
 *     summary: Whether to show the morning slide-in for this user today
 *     tags: [Agenda]
 */
router.get(
  "/should-greet",
  authorizeModule("agenda", "read"),
  asyncHandler(agendaController.shouldGreet),
);

// ── Tasks ──

/**
 * @swagger
 * /agenda/tasks:
 *   get:
 *     summary: List tasks (filterable by goal, status, due range)
 *     tags: [Agenda]
 */
router.get(
  "/tasks",
  authorizeModule("agenda", "read"),
  validate(listTasksQuerySchema, "query"),
  cacheRoute("agenda-tasks", CacheTTL.SHORT),
  asyncHandler(agendaController.listTasks),
);

/**
 * @swagger
 * /agenda/tasks/{id}:
 *   get:
 *     summary: Get a single task
 *     tags: [Agenda]
 */
router.get(
  "/tasks/:id",
  authorizeModule("agenda", "read"),
  validate(getTaskSchema, "params"),
  asyncHandler(agendaController.getTask),
);

/**
 * @swagger
 * /agenda/tasks:
 *   post:
 *     summary: Create a daily task (optionally linked to a goal)
 *     tags: [Agenda]
 */
router.post(
  "/tasks",
  authorizeModule("agenda", "create"),
  validate(createTaskSchema),
  asyncHandler(agendaController.createTask),
);

/**
 * @swagger
 * /agenda/tasks/{id}:
 *   patch:
 *     summary: Update a task (status, date, priority, etc.)
 *     tags: [Agenda]
 */
router.patch(
  "/tasks/:id",
  authorizeModule("agenda", "update"),
  validate(updateTaskSchema),
  asyncHandler(agendaController.updateTask),
);

/**
 * @swagger
 * /agenda/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Agenda]
 */
router.delete(
  "/tasks/:id",
  authorizeModule("agenda", "delete"),
  validate(getTaskSchema, "params"),
  asyncHandler(agendaController.deleteTask),
);

/**
 * @swagger
 * /agenda/tasks/rollover-decision:
 *   post:
 *     summary: Resolve a pending rollover decision (keep / reschedule / skip)
 *     tags: [Agenda]
 */
router.post(
  "/tasks/rollover-decision",
  authorizeModule("agenda", "update"),
  validate(rolloverDecisionSchema),
  asyncHandler(agendaController.resolveRollover),
);

export default router;
