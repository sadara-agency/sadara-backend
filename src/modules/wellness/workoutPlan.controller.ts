import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix } from "@shared/utils/cache";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
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

// The player id used by the projection lives on `user.playerId` (the user's
// linked player record), NOT `user.id`. All materialized sessions are keyed by
// it, so every player write path must use it.
function requirePlayerId(req: AuthRequest): string {
  const playerId = (req.user as { playerId?: string } | undefined)?.playerId;
  if (!playerId) throw new AppError("Player account not linked", 403);
  return playerId;
}

// ── Resolve / materialize (player) ──
export async function resolveSession(req: AuthRequest, res: Response) {
  const playerId = requirePlayerId(req);
  const session = await svc.resolveOrMaterializeSession(req.body, playerId);
  sendSuccess(res, session);
}

// ── Session actions (player) ──
export async function startSession(req: AuthRequest, res: Response) {
  const playerId = requirePlayerId(req);
  const real = await svc.resolveOrMaterializeSession(req.body, playerId);
  const session = await svc.startSession(real.id, playerId);
  sendSuccess(res, session, "Session started");
}

export async function completeSession(req: AuthRequest, res: Response) {
  const playerId = requirePlayerId(req);
  const real = await svc.resolveOrMaterializeSession(req.body, playerId);
  const session = await svc.completeSession(real.id, playerId, {
    durationMin: req.body.durationMin ?? null,
    playerNotes: req.body.playerNotes ?? null,
  });
  sendSuccess(res, session, "Session completed");
}

export async function skipSession(req: AuthRequest, res: Response) {
  const playerId = requirePlayerId(req);
  const real = await svc.resolveOrMaterializeSession(req.body, playerId);
  const session = await svc.skipSession(real.id, playerId);
  sendSuccess(res, session, "Session skipped");
}

// ── Set logging (player) — :sessionId here is a REAL workout_sessions id ──
export async function logSet(req: AuthRequest, res: Response) {
  const playerId = requirePlayerId(req);
  const log = await svc.logSet(req.params.sessionId, req.body, playerId);
  sendSuccess(res, log, "Set logged");
}

export async function getSessionLogs(req: AuthRequest, res: Response) {
  const logs = await svc.getSessionLogs(req.params.sessionId);
  sendSuccess(res, logs);
}

// ── Workout history (player) ──
export async function workoutHistory(req: AuthRequest, res: Response) {
  const playerId = requirePlayerId(req);
  const result = await svc.listWorkoutHistory(playerId, req.query);
  sendPaginated(res, result.data, result.meta);
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
