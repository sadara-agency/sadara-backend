// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.routes.ts
// RESTful routes for Task CRUD.
//
// Replaces the old monolithic task.routes.ts that had
// schemas, raw SQL, and business logic all in one file.
//
// Same endpoints preserved for backward compatibility:
//   GET    /              → list (with filters)
//   GET    /:id           → get by ID
//   POST   /              → create
//   PATCH  /:id           → update task fields
//   PATCH  /:id/status    → update status only
//   DELETE /:id           → delete
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
} from "@modules/tasks/task.validation";
import * as taskController from "@modules/tasks/task.controller";

const taskIdParamSchema = z.object({ id: z.string().uuid() });

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("tasks"));

// ── Read ──
router.get(
  "/",
  authorizeModule("tasks", "read"),
  validate(taskQuerySchema, "query"),
  asyncHandler(taskController.list),
);
router.get(
  "/:id",
  authorizeModule("tasks", "read"),
  asyncHandler(taskController.getById),
);
router.get(
  "/:id/suggested-assignees",
  authorizeModule("tasks", "update"),
  validate(taskIdParamSchema, "params"),
  asyncHandler(taskController.suggestedAssignees),
);

// ── Write ──
router.post(
  "/",
  authorizeModule("tasks", "create"),
  validate(createTaskSchema),
  asyncHandler(taskController.create),
);
router.patch(
  "/:id",
  authorizeModule("tasks", "update"),
  validate(updateTaskSchema),
  asyncHandler(taskController.update),
);
router.patch(
  "/:id/status",
  authorizeModule("tasks", "update"),
  validate(updateStatusSchema),
  asyncHandler(taskController.updateStatus),
);

// ── Sub-Tasks ──
router.post(
  "/:id/subtasks",
  authorizeModule("tasks", "create"),
  validate(createTaskSchema),
  asyncHandler(taskController.createSubTask),
);
router.put(
  "/:id/subtasks/reorder",
  authorizeModule("tasks", "update"),
  asyncHandler(taskController.reorderSubTasks),
);

// ── Delete (Admin / Manager only) ──
router.delete(
  "/:id",
  authorizeModule("tasks", "delete"),
  asyncHandler(taskController.remove),
);

export default router;
