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
import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  taskQuerySchema,
} from './task.schema';
import * as taskController from './task.controller';

const router = Router();
router.use(authenticate);

// ── Read ──
router.get('/', validate(taskQuerySchema, 'query'), asyncHandler(taskController.list));
router.get('/:id', asyncHandler(taskController.getById));

// ── Write ──
router.post('/', validate(createTaskSchema), asyncHandler(taskController.create));
router.patch('/:id', validate(updateTaskSchema), asyncHandler(taskController.update));
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(taskController.updateStatus));

// ── Delete (Admin / Manager only) ──
router.delete('/:id', authorize('Admin', 'Manager'), asyncHandler(taskController.remove));

export default router;