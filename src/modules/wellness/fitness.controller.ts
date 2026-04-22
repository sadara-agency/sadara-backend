// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/fitness.controller.ts
// ═══════════════════════════════════════════════════════════════

import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { AppError } from "@middleware/errorHandler";
import * as fitSvc from "./fitness.service";

const WELLNESS_CACHES = [CachePrefix.WELLNESS, CachePrefix.DASHBOARD];

// ══════════════════════════════════════════
// EXERCISES
// ══════════════════════════════════════════

export async function listExercises(req: AuthRequest, res: Response) {
  const result = await fitSvc.listExercises(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getExercise(req: AuthRequest, res: Response) {
  const exercise = await fitSvc.getExercise(req.params.id);
  sendSuccess(res, exercise);
}

export async function createExercise(req: AuthRequest, res: Response) {
  const exercise = await fitSvc.createExercise(req.body, req.user!.id);
  sendCreated(res, exercise);
  logAudit(
    "CREATE",
    "wellness",
    exercise.id,
    buildAuditContext(req.user!, req.ip),
    `Created exercise: ${req.body.name}`,
  ).catch(() => {});
}

export async function updateExercise(req: AuthRequest, res: Response) {
  const exercise = await fitSvc.updateExercise(req.params.id, req.body);
  sendSuccess(res, exercise, "Exercise updated");
  logAudit(
    "UPDATE",
    "wellness",
    exercise.id,
    buildAuditContext(req.user!, req.ip),
    `Updated exercise: ${exercise.name}`,
  ).catch(() => {});
}

export async function deleteExercise(req: AuthRequest, res: Response) {
  await fitSvc.deleteExercise(req.params.id);
  sendSuccess(res, null, "Exercise deactivated");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

// ══════════════════════════════════════════
// WORKOUT TEMPLATES
// ══════════════════════════════════════════

export async function listTemplates(req: AuthRequest, res: Response) {
  const result = await fitSvc.listTemplates(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getTemplate(req: AuthRequest, res: Response) {
  const template = await fitSvc.getTemplate(req.params.id);
  sendSuccess(res, template);
}

export async function createTemplate(req: AuthRequest, res: Response) {
  const template = await fitSvc.createTemplate(req.body, req.user!.id);
  sendCreated(res, template);
  logAudit(
    "CREATE",
    "wellness",
    (template as any).id,
    buildAuditContext(req.user!, req.ip),
    `Created workout template: ${req.body.name}`,
  ).catch(() => {});
}

export async function updateTemplate(req: AuthRequest, res: Response) {
  const template = await fitSvc.updateTemplate(req.params.id, req.body);
  sendSuccess(res, template, "Template updated");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function deleteTemplate(req: AuthRequest, res: Response) {
  await fitSvc.deleteTemplate(req.params.id);
  sendSuccess(res, null, "Template deactivated");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

// ══════════════════════════════════════════
// WORKOUT ASSIGNMENTS
// ══════════════════════════════════════════

export async function listAssignments(req: AuthRequest, res: Response) {
  const result = await fitSvc.listAssignments(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getAssignment(req: AuthRequest, res: Response) {
  const assignment = await fitSvc.getAssignment(req.params.id);
  sendSuccess(res, assignment);
}

export async function createAssignment(req: AuthRequest, res: Response) {
  const assignment = await fitSvc.createAssignment(req.body, req.user!.id);
  sendCreated(res, assignment);
  logAudit(
    "CREATE",
    "wellness",
    assignment.id,
    buildAuditContext(req.user!, req.ip),
    `Assigned workout to player ${req.body.playerId}`,
  ).catch(() => {});
}

export async function updateAssignment(req: AuthRequest, res: Response) {
  const assignment = await fitSvc.updateAssignment(req.params.id, req.body);
  sendSuccess(res, assignment, "Assignment updated");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function deleteAssignment(req: AuthRequest, res: Response) {
  await fitSvc.deleteAssignment(req.params.id);
  sendSuccess(res, null, "Assignment deleted");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function completeAssignment(req: AuthRequest, res: Response) {
  const assignment = await fitSvc.completeAssignment(req.params.assignmentId);
  sendSuccess(res, assignment, "Workout completed");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE
// ══════════════════════════════════════════

export async function myWorkouts(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const result = await fitSvc.getPlayerWorkouts(playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function myCompleteWorkout(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const assignment = await fitSvc.getAssignment(req.params.assignmentId);
  if ((assignment as any).playerId !== playerId) {
    throw new AppError("Access denied", 403);
  }
  const result = await fitSvc.completeAssignment(req.params.assignmentId);
  sendSuccess(res, result, "Workout completed");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}
