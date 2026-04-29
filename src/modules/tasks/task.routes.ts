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
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
  approveTaskSchema,
  rejectTaskSchema,
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
  "/stats",
  authorizeModule("tasks", "read"),
  validate(taskQuerySchema, "query"),
  asyncHandler(taskController.getStats),
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

// ── Review Workflow (Admin & Manager only) ──
/**
 * @swagger
 * /tasks/{id}/approve:
 *   post:
 *     summary: Approve a task that is pending review
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task approved and marked Completed }
 *       422: { description: Task is not in PendingReview state }
 */
router.post(
  "/:id/approve",
  authorize("Admin", "Manager"),
  validate(taskIdParamSchema, "params"),
  validate(approveTaskSchema),
  asyncHandler(taskController.approve),
);

/**
 * @swagger
 * /tasks/{id}/reject:
 *   post:
 *     summary: Send a task back for rework with a reviewer note
 *     tags: [Tasks]
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
 *             required: [note]
 *             properties:
 *               note: { type: string, minLength: 1, maxLength: 2000 }
 *     responses:
 *       200: { description: Task moved to NeedsRework, assignee notified }
 *       422: { description: Task is not in PendingReview state }
 */
router.post(
  "/:id/reject",
  authorize("Admin", "Manager"),
  validate(taskIdParamSchema, "params"),
  validate(rejectTaskSchema),
  asyncHandler(taskController.reject),
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

// ── Deliverables (Media tasks only) ──
router.post(
  "/:id/deliverables",
  authorizeModule("tasks", "update"),
  (req, res, next) => {
    uploadSingle(req, res, (err: any) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "File too large. Maximum size is 25MB."
            : err.message || "Upload failed";
        return res.status(400).json({ success: false, message: msg });
      }
      next();
    });
  },
  verifyFileType,
  asyncHandler(taskController.addDeliverable),
);

router.delete(
  "/:id/deliverables/:index",
  authorizeModule("tasks", "update"),
  asyncHandler(taskController.removeDeliverable),
);

export default router;
