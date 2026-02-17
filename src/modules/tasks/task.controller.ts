// ─────────────────────────────────────────────────────────────
// src/modules/tasks/task.controller.ts
// Thin controller layer for Task CRUD.
// Follows the same pattern as player.controller.ts.
// ─────────────────────────────────────────────────────────────
import { Response } from 'express';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendCreated, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import * as taskService from './task.service';

// ── List Tasks ──
export async function list(req: AuthRequest, res: Response) {
  const result = await taskService.listTasks(req.query);
  sendPaginated(res, result.data, result.meta);
}

// ── Get Task by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const task = await taskService.getTaskById(req.params.id);
  sendSuccess(res, task);
}

// ── Create Task ──
export async function create(req: AuthRequest, res: Response) {
  const task = await taskService.createTask(req.body, req.user!.id);

  await logAudit(
    'CREATE',
    'tasks',
    (task as any).id,
    buildAuditContext(req.user!, req.ip),
    `Created task: ${(task as any).title}`,
  );

  sendCreated(res, task);
}

// ── Update Task ──
export async function update(req: AuthRequest, res: Response) {
  const task = await taskService.updateTask(req.params.id, req.body);

  await logAudit(
    'UPDATE',
    'tasks',
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Updated task: ${(task as any).title}`,
  );

  sendSuccess(res, task, 'Task updated');
}

// ── Update Status ──
export async function updateStatus(req: AuthRequest, res: Response) {
  const task = await taskService.updateTaskStatus(req.params.id, req.body.status);

  await logAudit(
    'UPDATE',
    'tasks',
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Task status changed to: ${req.body.status}`,
  );

  sendSuccess(res, task, 'Task status updated');
}

// ── Delete Task ──
export async function remove(req: AuthRequest, res: Response) {
  const result = await taskService.deleteTask(req.params.id);

  await logAudit(
    'DELETE',
    'tasks',
    result.id,
    buildAuditContext(req.user!, req.ip),
    'Task deleted',
  );

  sendSuccess(res, result, 'Task deleted');
}