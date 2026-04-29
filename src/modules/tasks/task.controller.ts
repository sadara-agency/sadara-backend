import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import { AppError } from "@middleware/errorHandler";
import { uploadFile } from "@shared/utils/storage";
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

// ── Stats (full-dataset aggregations for KPIs) ──
export async function getStats(req: AuthRequest, res: Response) {
  const stats = await taskService.getTaskStats(req.query, req.user);
  sendSuccess(res, stats);
}

// ── Update Status (custom) ──
// Non-admin/manager users that mark a task "Completed" actually submit it
// for review — Admin or Manager must then approve or reject.
export async function updateStatus(req: AuthRequest, res: Response) {
  const requestedStatus = req.body.status as string;
  const reviewerRoles = ["Admin", "Manager"];
  const isReviewer = reviewerRoles.includes(req.user!.role);

  let task;
  let effectiveStatus = requestedStatus;

  if (requestedStatus === "Completed" && !isReviewer) {
    task = await taskService.submitTaskForReview(req.params.id);
    effectiveStatus = "PendingReview";
  } else {
    task = await taskService.updateTaskStatus(
      req.params.id,
      requestedStatus as any,
    );
  }

  await logAudit(
    "UPDATE",
    "tasks",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Task status changed to: ${effectiveStatus}`,
  );

  sendSuccess(res, task, "Task status updated");
}

// ── Approve a task pending review (Admin/Manager only) ──
export async function approve(req: AuthRequest, res: Response) {
  const task = await taskService.approveTask(req.params.id, req.user!);

  await logAudit(
    "UPDATE",
    "tasks",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    "Task approved (review)",
  );

  sendSuccess(res, task, "Task approved");
}

// ── Reject a task pending review with a reason (Admin/Manager only) ──
export async function reject(req: AuthRequest, res: Response) {
  const note = req.body.note as string;
  const task = await taskService.rejectTask(req.params.id, req.user!, note);

  await logAudit(
    "UPDATE",
    "tasks",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Task sent back for rework: ${note}`,
  );

  sendSuccess(res, task, "Task sent back for rework");
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

// ── Suggested Assignees ──
export async function suggestedAssignees(req: AuthRequest, res: Response) {
  const data = await taskService.getSuggestedAssignees(req.params.id, req.user);
  sendSuccess(res, data);
}

// ── Add Deliverable (Media tasks) ──
export async function addDeliverable(req: AuthRequest, res: Response) {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const result = await uploadFile({
    folder: "photos",
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    buffer: req.file.buffer,
    generateThumbnail: true,
  });

  const { caption } = req.body;
  const task = await taskService.addDeliverable(
    req.params.id,
    req.user!.id,
    { url: result.url, thumbnailUrl: result.thumbnailUrl },
    caption,
  );
  sendSuccess(res, task);
}

// ── Remove Deliverable (Media tasks) ──
export async function removeDeliverable(req: AuthRequest, res: Response) {
  const { id, index } = req.params;
  const task = await taskService.removeDeliverable(id, parseInt(index, 10));
  sendSuccess(res, task);
}
