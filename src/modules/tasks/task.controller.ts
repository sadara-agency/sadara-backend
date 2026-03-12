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
