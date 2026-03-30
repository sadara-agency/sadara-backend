import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import * as taskService from "@modules/tasks/task.service";

const crud = createCrudController({
  service: {
    list: (query) => taskService.listTasks(query),
    getById: (id) => taskService.getTaskById(id),
    create: (body, userId) => taskService.createTask(body, userId),
    update: (id, body) => taskService.updateTask(id, body),
    delete: (id) => taskService.deleteTask(id),
  },
  entity: "tasks",
  cachePrefixes: [],
  label: (t) => t.title,
});

export const { list, getById, create, update, remove } = crud;

// ── Update Status (custom) ──
export async function updateStatus(req: AuthRequest, res: Response) {
  const task = await taskService.updateTaskStatus(
    req.params.id,
    req.body.status,
  );

  await logAudit(
    "UPDATE",
    "tasks",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Task status changed to: ${req.body.status}`,
  );

  sendSuccess(res, task, "Task status updated");
}

// ── Create Sub-Task ──
export async function createSubTask(req: AuthRequest, res: Response) {
  const task = await taskService.createSubTask(
    req.params.id,
    req.body,
    req.user!.id,
  );

  await logAudit(
    "CREATE",
    "tasks",
    task!.id,
    buildAuditContext(req.user!, req.ip),
    `Sub-task created under ${req.params.id}`,
  );

  sendSuccess(res, task, "Sub-task created", 201);
}

// ── Reorder Sub-Tasks ──
export async function reorderSubTasks(req: AuthRequest, res: Response) {
  await taskService.reorderSubTasks(req.params.id, req.body.orderedIds);
  sendSuccess(res, null, "Sub-tasks reordered");
}
