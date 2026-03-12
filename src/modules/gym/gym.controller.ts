import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as svc from "@modules/gym/gym.service";

// ═══════════════════════════════════════════
// EXERCISE LIBRARY
// ═══════════════════════════════════════════

export async function listExercises(req: AuthRequest, res: Response) {
  const result = await svc.listExercises(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getExercise(req: AuthRequest, res: Response) {
  const exercise = await svc.getExercise(req.params.id);
  sendSuccess(res, exercise);
}

export async function createExercise(req: AuthRequest, res: Response) {
  const exercise = await svc.createExercise(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "gym",
    exercise.id,
    buildAuditContext(req.user!, req.ip),
    `Created exercise: ${exercise.nameEn}`,
  );
  sendCreated(res, exercise);
}

export async function updateExercise(req: AuthRequest, res: Response) {
  const exercise = await svc.updateExercise(req.params.id, req.body);
  sendSuccess(res, exercise, "Exercise updated");
}

export async function deleteExercise(req: AuthRequest, res: Response) {
  const result = await svc.deleteExercise(req.params.id);
  await logAudit(
    "DELETE",
    "gym",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Exercise deleted",
  );
  sendSuccess(res, result, "Exercise deleted");
}

// ═══════════════════════════════════════════
// BODY METRICS
// ═══════════════════════════════════════════

export async function listBodyMetrics(req: AuthRequest, res: Response) {
  const result = await svc.listBodyMetrics(req.params.playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function createBodyMetric(req: AuthRequest, res: Response) {
  const metric = await svc.createBodyMetric(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "gym",
    metric.id,
    buildAuditContext(req.user!, req.ip),
    "Recorded body metrics",
  );
  sendCreated(res, metric);
}

export async function updateBodyMetric(req: AuthRequest, res: Response) {
  const metric = await svc.updateBodyMetric(req.params.id, req.body);
  sendSuccess(res, metric, "Metric updated");
}

export async function deleteBodyMetric(req: AuthRequest, res: Response) {
  const result = await svc.deleteBodyMetric(req.params.id);
  sendSuccess(res, result, "Metric deleted");
}

export async function getLatestBodyMetric(req: AuthRequest, res: Response) {
  const metric = await svc.getLatestBodyMetric(req.params.playerId);
  sendSuccess(res, metric);
}

// ═══════════════════════════════════════════
// METRIC TARGETS
// ═══════════════════════════════════════════

export async function getMetricTarget(req: AuthRequest, res: Response) {
  const target = await svc.getMetricTarget(req.params.playerId);
  sendSuccess(res, target);
}

export async function createMetricTarget(req: AuthRequest, res: Response) {
  const target = await svc.createMetricTarget(req.body, req.user!.id);
  sendCreated(res, target);
}

export async function updateMetricTarget(req: AuthRequest, res: Response) {
  const target = await svc.updateMetricTarget(req.params.id, req.body);
  sendSuccess(res, target, "Target updated");
}

// ═══════════════════════════════════════════
// BMR CALCULATOR
// ═══════════════════════════════════════════

export async function calculateBmr(req: AuthRequest, res: Response) {
  const result = await svc.calculateAndSaveBmr(req.body, req.user!.id);
  sendCreated(res, result);
}

export async function getBmrHistory(req: AuthRequest, res: Response) {
  const history = await svc.getBmrHistory(req.params.playerId);
  sendSuccess(res, history);
}

// ═══════════════════════════════════════════
// WORKOUT PLANS
// ═══════════════════════════════════════════

export async function listWorkoutPlans(req: AuthRequest, res: Response) {
  const result = await svc.listWorkoutPlans(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getWorkoutPlan(req: AuthRequest, res: Response) {
  const plan = await svc.getWorkoutPlan(req.params.id);
  sendSuccess(res, plan);
}

export async function createWorkoutPlan(req: AuthRequest, res: Response) {
  const plan = await svc.createWorkoutPlan(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "gym",
    plan.id,
    buildAuditContext(req.user!, req.ip),
    `Created workout plan: ${plan.nameEn}`,
  );
  sendCreated(res, plan);
}

export async function updateWorkoutPlan(req: AuthRequest, res: Response) {
  const plan = await svc.updateWorkoutPlan(req.params.id, req.body);
  sendSuccess(res, plan, "Plan updated");
}

export async function deleteWorkoutPlan(req: AuthRequest, res: Response) {
  const result = await svc.deleteWorkoutPlan(req.params.id);
  await logAudit(
    "DELETE",
    "gym",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Workout plan deleted",
  );
  sendSuccess(res, result, "Plan deleted");
}

export async function duplicateWorkoutPlan(req: AuthRequest, res: Response) {
  const plan = await svc.duplicateWorkoutPlan(req.params.id, req.user!.id);
  await logAudit(
    "CREATE",
    "gym",
    plan.id,
    buildAuditContext(req.user!, req.ip),
    "Duplicated workout plan",
  );
  sendCreated(res, plan);
}

// ── Sessions ──

export async function addSession(req: AuthRequest, res: Response) {
  const session = await svc.addSession(req.params.planId, req.body);
  sendCreated(res, session);
}

export async function updateSession(req: AuthRequest, res: Response) {
  const session = await svc.updateSession(req.params.sessionId, req.body);
  sendSuccess(res, session, "Session updated");
}

export async function deleteSession(req: AuthRequest, res: Response) {
  const result = await svc.deleteSession(req.params.sessionId);
  sendSuccess(res, result, "Session deleted");
}

// ── Session Exercises ──

export async function addExerciseToSession(req: AuthRequest, res: Response) {
  const exercise = await svc.addExerciseToSession(
    req.params.sessionId,
    req.body,
  );
  sendCreated(res, exercise);
}

export async function updateWorkoutExercise(req: AuthRequest, res: Response) {
  const exercise = await svc.updateWorkoutExercise(
    req.params.exerciseId,
    req.body,
  );
  sendSuccess(res, exercise, "Exercise updated");
}

export async function deleteWorkoutExercise(req: AuthRequest, res: Response) {
  const result = await svc.deleteWorkoutExercise(req.params.exerciseId);
  sendSuccess(res, result, "Exercise removed");
}

// ── Assignments ──

export async function assignWorkout(req: AuthRequest, res: Response) {
  const plan = await svc.assignWorkout(req.params.id, req.body, req.user!.id);
  await logAudit(
    "UPDATE",
    "gym",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Assigned workout to ${req.body.playerIds.length} players`,
  );
  sendSuccess(res, plan, "Players assigned");
}

export async function removeAssignment(req: AuthRequest, res: Response) {
  const result = await svc.removeAssignment(req.params.assignmentId);
  sendSuccess(res, result, "Assignment removed");
}

// ── Player Workout Self-Service ──

export async function getMyWorkouts(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const workouts = await svc.getPlayerWorkouts(playerId);
  sendSuccess(res, workouts);
}

export async function logMyWorkout(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const log = await svc.logWorkoutSession(
    req.params.assignmentId,
    playerId,
    req.body,
  );
  sendCreated(res, log);
}

export async function getWorkoutLogs(req: AuthRequest, res: Response) {
  const logs = await svc.getWorkoutLogs(req.params.assignmentId);
  sendSuccess(res, logs);
}

// ═══════════════════════════════════════════
// FOOD DATABASE
// ═══════════════════════════════════════════

export async function listFoods(req: AuthRequest, res: Response) {
  const result = await svc.listFoods(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getFood(req: AuthRequest, res: Response) {
  const food = await svc.getFood(req.params.id);
  sendSuccess(res, food);
}

export async function createFood(req: AuthRequest, res: Response) {
  const food = await svc.createFood(req.body, req.user!.id);
  sendCreated(res, food);
}

export async function updateFood(req: AuthRequest, res: Response) {
  const food = await svc.updateFood(req.params.id, req.body);
  sendSuccess(res, food, "Food updated");
}

export async function deleteFood(req: AuthRequest, res: Response) {
  const result = await svc.deleteFood(req.params.id);
  sendSuccess(res, result, "Food deleted");
}

// ═══════════════════════════════════════════
// DIET PLANS
// ═══════════════════════════════════════════

export async function listDietPlans(req: AuthRequest, res: Response) {
  const result = await svc.listDietPlans(req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function getDietPlan(req: AuthRequest, res: Response) {
  const plan = await svc.getDietPlan(req.params.id);
  sendSuccess(res, plan);
}

export async function createDietPlan(req: AuthRequest, res: Response) {
  const plan = await svc.createDietPlan(req.body, req.user!.id);
  await logAudit(
    "CREATE",
    "gym",
    plan.id,
    buildAuditContext(req.user!, req.ip),
    `Created diet plan: ${plan.nameEn}`,
  );
  sendCreated(res, plan);
}

export async function updateDietPlan(req: AuthRequest, res: Response) {
  const plan = await svc.updateDietPlan(req.params.id, req.body);
  sendSuccess(res, plan, "Diet plan updated");
}

export async function deleteDietPlan(req: AuthRequest, res: Response) {
  const result = await svc.deleteDietPlan(req.params.id);
  await logAudit(
    "DELETE",
    "gym",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Diet plan deleted",
  );
  sendSuccess(res, result, "Diet plan deleted");
}

// ── Diet Meals ──

export async function addMealToPlan(req: AuthRequest, res: Response) {
  const plan = await svc.addMealToPlan(req.params.planId, req.body);
  sendSuccess(res, plan, "Meal added");
}

export async function deleteMeal(req: AuthRequest, res: Response) {
  const result = await svc.deleteMeal(req.params.mealId);
  sendSuccess(res, result, "Meal deleted");
}

export async function addItemToMeal(req: AuthRequest, res: Response) {
  const item = await svc.addItemToMeal(req.params.mealId, req.body);
  sendCreated(res, item);
}

export async function deleteItemFromMeal(req: AuthRequest, res: Response) {
  const result = await svc.deleteItemFromMeal(req.params.itemId);
  sendSuccess(res, result, "Item removed");
}

// ── Player Diet Self-Service ──

export async function getMyDietPlans(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const result = await svc.listDietPlans({ playerId, status: "active" });
  sendSuccess(res, result.data);
}

export async function logMyAdherence(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const log = await svc.logDietAdherence(req.params.planId, playerId, req.body);
  sendCreated(res, log);
}

export async function getPlayerAdherence(req: AuthRequest, res: Response) {
  const adherence = await svc.getPlayerDietAdherence(
    req.params.playerId,
    req.query,
  );
  sendSuccess(res, adherence);
}

// ═══════════════════════════════════════════
// COACH DASHBOARD
// ═══════════════════════════════════════════

export async function getCoachDashboard(req: AuthRequest, res: Response) {
  const dashboard = await svc.getCoachDashboard(req.user!.id);
  sendSuccess(res, dashboard);
}

export async function markAlertRead(req: AuthRequest, res: Response) {
  const alert = await svc.markAlertRead(req.params.id, req.user!.id);
  sendSuccess(res, alert, "Alert marked as read");
}
