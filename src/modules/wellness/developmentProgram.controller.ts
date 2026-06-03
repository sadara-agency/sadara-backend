import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as svc from "./developmentProgram.service";

export async function list(req: AuthRequest, res: Response) {
  const result = await svc.listPrograms(req.query as any, req.user);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const program = await svc.getProgramById(req.params.id, req.user);
  sendSuccess(res, program);
}

export async function clone(req: AuthRequest, res: Response) {
  const program = await svc.cloneProgram(
    req.params.id,
    req.body,
    req.user!.id,
    req.user,
  );
  sendCreated(res, program);
  logAudit(
    "CREATE",
    "wellness",
    program.id,
    buildAuditContext(req.user!, req.ip),
    `Cloned development program from ${req.params.id}${
      req.body.asTemplate ? " as reusable template" : ""
    }`,
  ).catch(() => {});
}

export async function create(req: AuthRequest, res: Response) {
  const program = await svc.createProgram(req.body, req.user!.id);
  sendCreated(res, program);
  logAudit(
    "CREATE",
    "wellness",
    program.id,
    buildAuditContext(req.user!, req.ip),
    `Created development program: ${program.name}`,
  ).catch(() => {});
}

export async function update(req: AuthRequest, res: Response) {
  const program = await svc.updateProgram(req.params.id, req.body);
  sendSuccess(res, program, "Program updated");
  logAudit(
    "UPDATE",
    "wellness",
    program.id,
    buildAuditContext(req.user!, req.ip),
    `Updated development program ${req.params.id}`,
  ).catch(() => {});
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteProgram(req.params.id);
  sendSuccess(res, result, "Program deleted");
  logAudit(
    "DELETE",
    "wellness",
    result.id,
    buildAuditContext(req.user!, req.ip),
    `Deleted development program ${result.id}`,
  ).catch(() => {});
}

export async function addExercise(req: AuthRequest, res: Response) {
  const exercise = await svc.addExerciseToProgram(req.params.id, req.body);
  sendCreated(res, exercise);
}

export async function updateExercise(req: AuthRequest, res: Response) {
  const exercise = await svc.updateExerciseInProgram(
    req.params.id,
    req.params.programExerciseId,
    req.body,
  );
  sendSuccess(res, exercise, "Exercise updated");
}

export async function removeExercise(req: AuthRequest, res: Response) {
  const result = await svc.removeExerciseFromProgram(
    req.params.id,
    req.params.exerciseId,
  );
  sendSuccess(res, result, "Exercise removed from program");
}

export async function reorderExercises(req: AuthRequest, res: Response) {
  const program = await svc.reorderExercises(
    req.params.id,
    req.body.orderedExerciseIds,
  );
  sendSuccess(res, program, "Exercises reordered");
}

// ── DaySession handlers ──

export async function listDaySessions(req: AuthRequest, res: Response) {
  const sessions = await svc.listDaySessions(req.params.id);
  sendSuccess(res, sessions);
}

export async function createDaySession(req: AuthRequest, res: Response) {
  const session = await svc.createDaySession(req.params.id, req.body);
  sendCreated(res, session);
}

export async function updateDaySession(req: AuthRequest, res: Response) {
  const session = await svc.updateDaySession(
    req.params.id,
    req.params.sessionId,
    req.body,
  );
  sendSuccess(res, session, "Day session updated");
}

export async function deleteDaySession(req: AuthRequest, res: Response) {
  const result = await svc.deleteDaySession(
    req.params.id,
    req.params.sessionId,
  );
  sendSuccess(res, result, "Day session deleted");
}

// ── Player day-completion handlers ──

export async function listCompletions(req: AuthRequest, res: Response) {
  const rows = await svc.listCompletions(
    req.params.id,
    req.query as any,
    req.user,
  );
  sendSuccess(res, rows);
}

export async function markCompletion(req: AuthRequest, res: Response) {
  const row = await svc.markDayComplete(req.params.id, req.body, req.user);
  sendCreated(res, row);
}

export async function unmarkCompletion(req: AuthRequest, res: Response) {
  const result = await svc.unmarkDayComplete(req.params.id, req.body, req.user);
  sendSuccess(res, result, "Completion removed");
}
