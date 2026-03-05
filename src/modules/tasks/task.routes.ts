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
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
} from "./task.schema";
import * as taskController from "./task.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("tasks", "read"),
  validate(taskQuerySchema, "query"),
  asyncHandler(taskController.list),
);
router.get("/:id", authorizeModule("tasks", "read"), asyncHandler(taskController.getById));

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

// ── Delete (Admin / Manager only) ──
router.delete(
  "/:id",
  authorizeModule("tasks", "delete"),
  asyncHandler(taskController.remove),
);

export default router;
