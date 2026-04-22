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
  const result = await svc.listPrograms(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response) {
  const program = await svc.getProgramById(req.params.id);
  sendSuccess(res, program);
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
