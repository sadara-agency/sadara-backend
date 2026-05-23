import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { AppError } from "@middleware/errorHandler";
import { uploadFile } from "@shared/utils/storage";
import * as taskService from "@modules/tasks/task.service";

const TASK_CACHES = [CachePrefix.TASKS];

const crud = createCrudController({
  service: {
    list: (query, user) => taskService.listTasks(query, user),
    getById: (id, user) => taskService.getTaskById(id, user),
    create: (body, userId) => taskService.createTask(body, userId),
    update: (id, body) => taskService.updateTask(id, body),
    delete: (id) => taskService.deleteTask(id),
  },
  entity: "tasks",
  cachePrefixes: TASK_CACHES,
  label: (t) => t.title,
});

export const { list, getById, create, update, remove } = crud;

// ── Stats (full-dataset aggregations for KPIs) ──
export async function getStats(req: AuthRequest, res: Response) {
  const stats = await taskService.getTaskStats(req.query, req.user);
  sendSuccess(res, stats);
}

// ── Update Status (custom) ──
// Status changes are applied directly. When a task with a proof-of-work
// requirement is marked Completed, updateTaskStatus enforces the attachment.
export async function updateStatus(req: AuthRequest, res: Response) {
  const requestedStatus = req.body.status as string;

  const task = await taskService.updateTaskStatus(
    req.params.id,
    requestedStatus as any,
  );

  await logAudit(
    "UPDATE",
    "tasks",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Task status changed to: ${requestedStatus}`,
  );

  void invalidateMultiple(TASK_CACHES);
  sendSuccess(res, task, "Task status updated");
}

// ── Approve a task pending review (Admin/Manager only) — retained, unused by UI ──
export async function approve(req: AuthRequest, res: Response) {
  const task = await taskService.approveTask(req.params.id, req.user!);

  await logAudit(
    "UPDATE",
    "tasks",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    "Task approved (review)",
  );

  void invalidateMultiple(TASK_CACHES);
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

  void invalidateMultiple(TASK_CACHES);
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

  void invalidateMultiple(TASK_CACHES);
  sendSuccess(res, task, "Sub-task created", 201);
}

// ── Reorder Sub-Tasks ──
export async function reorderSubTasks(req: AuthRequest, res: Response) {
  await taskService.reorderSubTasks(req.params.id, req.body.orderedIds);
  void invalidateMultiple(TASK_CACHES);
  sendSuccess(res, null, "Sub-tasks reordered");
}

// ── Suggested Assignees ──
export async function suggestedAssignees(req: AuthRequest, res: Response) {
  const data = await taskService.getSuggestedAssignees(req.params.id, req.user);
  sendSuccess(res, data);
}

// ── Add Deliverable / Proof-of-work attachment ──
// Routes image types to the "photos" folder (gets WebP + thumbnail).
// All other types (PDF, Word, Excel, etc.) go to "documents" (private, signed URLs).
export async function addDeliverable(req: AuthRequest, res: Response) {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const isImage = req.file.mimetype.startsWith("image/");
  const result = await uploadFile({
    folder: isImage ? "photos" : "documents",
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    buffer: req.file.buffer,
    generateThumbnail: isImage,
  });

  const { caption } = req.body;
  const task = await taskService.addDeliverable(
    req.params.id,
    req.user!.id,
    { url: result.url, thumbnailUrl: result.thumbnailUrl },
    caption,
  );
  void invalidateMultiple(TASK_CACHES);
  sendSuccess(res, task);
}

// ── Submit Justification (staff proof-of-work description) ──
export async function submitJustification(req: AuthRequest, res: Response) {
  const task = await taskService.submitJustification(
    req.params.id,
    req.body.justificationText as string,
  );

  await logAudit(
    "UPDATE",
    "tasks",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    "Task justification submitted",
  );

  void invalidateMultiple(TASK_CACHES);
  sendSuccess(res, task, "Justification saved");
}

// ── Remove Deliverable (Media tasks) ──
export async function removeDeliverable(req: AuthRequest, res: Response) {
  const { id, index } = req.params;
  const task = await taskService.removeDeliverable(id, parseInt(index, 10));
  void invalidateMultiple(TASK_CACHES);
  sendSuccess(res, task);
}
