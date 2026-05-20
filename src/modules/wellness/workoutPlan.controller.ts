import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import { sendSuccess } from "@shared/utils/apiResponse";
import { AppError } from "@middleware/errorHandler";
import type { AuthRequest } from "@shared/types";
import type { Response } from "express";
import * as svc from "./workoutPlan.service";

const crud = createCrudController({
  service: {
    list: (query, user) => svc.listWorkoutPlans(query, user),
    getById: (id, user) => svc.getWorkoutPlanById(id, user),
    create: (body, userId) => svc.createWorkoutPlan(body, userId),
    update: (id, body) => svc.updateWorkoutPlan(id, body),
    delete: (id) => svc.deleteWorkoutPlan(id),
  },
  entity: "workout-plans",
  cachePrefixes: [CachePrefix.WORKOUT_PLANS],
  label: (item) => item.name ?? item.id,
});

export const { list, getById, create, update, remove } = crud;

// ── Today's workout (player) ──
export async function todaysWorkout(req: AuthRequest, res: Response) {
  const playerId = (req.user as { playerId?: string } | undefined)?.playerId;
  if (!playerId) {
    sendSuccess(res, null, "Player account not linked");
    return;
  }
  const session = await svc.getTodaysWorkout(playerId);
  sendSuccess(res, session);
}

// ── Weekly workouts (player) ──
export async function weeklyWorkouts(req: AuthRequest, res: Response) {
  const playerId = (req.user as { playerId?: string } | undefined)?.playerId;
  if (!playerId) {
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const sessions = await svc.getWeeklyWorkouts(playerId);
  sendSuccess(res, sessions);
}

// ── Session actions (player) ──
export async function startSession(req: AuthRequest, res: Response) {
  const session = await svc.startSession(req.params.sessionId, req.user!.id);
  sendSuccess(res, session, "Session started");
}

export async function completeSession(req: AuthRequest, res: Response) {
  const session = await svc.completeSession(req.params.sessionId, req.user!.id);
  sendSuccess(res, session, "Session completed");
}

export async function skipSession(req: AuthRequest, res: Response) {
  const session = await svc.skipSession(req.params.sessionId, req.user!.id);
  sendSuccess(res, session, "Session skipped");
}

// ── Set logging (player) ──
export async function logSet(req: AuthRequest, res: Response) {
  const log = await svc.logSet(req.params.sessionId, req.body, req.user!.id);
  sendSuccess(res, log, "Set logged");
}

export async function getSessionLogs(req: AuthRequest, res: Response) {
  const logs = await svc.getSessionLogs(req.params.sessionId);
  sendSuccess(res, logs);
}

// ── Coach analytics ──
export async function planAdherence(req: AuthRequest, res: Response) {
  const data = await svc.getPlanAdherence(req.params.id);
  sendSuccess(res, data);
}

export async function exerciseProgression(req: AuthRequest, res: Response) {
  const { id, exerciseId } = req.params;
  if (!exerciseId) throw new AppError("exerciseId is required", 400);
  const data = await svc.getExerciseProgression(id, exerciseId);
  sendSuccess(res, data);
}
