import type { Response } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import * as agendaService from "./agenda.service";
import type {
  CreateGoalDTO,
  UpdateGoalDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  RolloverDecisionDTO,
} from "./agenda.validation";

// ── Goal controllers ──

export async function listGoals(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const {
    month,
    status,
    page = 1,
    limit = 50,
  } = req.query as Record<string, string>;
  const result = await agendaService.listGoals(userId, {
    month,
    status,
    page: Number(page),
    limit: Number(limit),
  });
  return sendPaginated(res, result.data, result.meta);
}

export async function getGoal(req: AuthRequest, res: Response) {
  const goal = await agendaService.getGoalById(req.params.id, req.user!.id);
  const progress = await agendaService.getGoalProgress(goal.id, req.user!.id);
  return sendSuccess(res, { ...goal.toJSON(), progress });
}

export async function createGoal(req: AuthRequest, res: Response) {
  const goal = await agendaService.createGoal(
    req.body as CreateGoalDTO,
    req.user!.id,
  );
  return sendCreated(res, goal, "Goal created");
}

export async function updateGoal(req: AuthRequest, res: Response) {
  const goal = await agendaService.updateGoal(
    req.params.id,
    req.body as UpdateGoalDTO,
    req.user!.id,
  );
  return sendSuccess(res, goal, "Goal updated");
}

export async function deleteGoal(req: AuthRequest, res: Response) {
  const result = await agendaService.deleteGoal(req.params.id, req.user!.id);
  return sendSuccess(res, result, "Goal deleted");
}

// ── Task controllers ──

export async function listTasks(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  const {
    goalId,
    status,
    priority,
    dueFrom,
    dueTo,
    needsRolloverDecision,
    page = "1",
    limit = "50",
  } = req.query as Record<string, string>;

  const result = await agendaService.listTasks(userId, {
    goalId,
    status,
    priority,
    dueFrom,
    dueTo,
    needsRolloverDecision:
      needsRolloverDecision !== undefined
        ? needsRolloverDecision === "true"
        : undefined,
    page: Number(page),
    limit: Number(limit),
  });
  return sendPaginated(res, result.data, result.meta);
}

export async function getTask(req: AuthRequest, res: Response) {
  const task = await agendaService.getTaskById(req.params.id, req.user!.id);
  return sendSuccess(res, task);
}

export async function getToday(req: AuthRequest, res: Response) {
  const userId = req.user!.id;
  await agendaService.markViewed(userId);
  const result = await agendaService.getTodayTasks(userId);
  return sendSuccess(res, result);
}

export async function shouldGreet(req: AuthRequest, res: Response) {
  const should = await agendaService.getShouldGreet(req.user!.id);
  return sendSuccess(res, { shouldGreet: should });
}

export async function createTask(req: AuthRequest, res: Response) {
  const task = await agendaService.createTask(
    req.body as CreateTaskDTO,
    req.user!.id,
  );
  return sendCreated(res, task, "Task created");
}

export async function updateTask(req: AuthRequest, res: Response) {
  const task = await agendaService.updateTask(
    req.params.id,
    req.body as UpdateTaskDTO,
    req.user!.id,
  );
  return sendSuccess(res, task, "Task updated");
}

export async function deleteTask(req: AuthRequest, res: Response) {
  const result = await agendaService.deleteTask(req.params.id, req.user!.id);
  return sendSuccess(res, result, "Task deleted");
}

export async function resolveRollover(req: AuthRequest, res: Response) {
  const task = await agendaService.resolveRollover(
    req.body as RolloverDecisionDTO,
    req.user!.id,
  );
  return sendSuccess(res, task, "Rollover decision saved");
}
