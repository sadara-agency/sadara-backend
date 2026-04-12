import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { invalidateMultiple } from "@shared/utils/cache";
import { CachePrefix } from "@shared/utils/cache";
import * as mealPlanService from "./mealPlan.service";

// ── List ──
export async function list(req: AuthRequest, res: Response) {
  const result = await mealPlanService.listMealPlans(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const plan = await mealPlanService.getMealPlanById(req.params.id);
  sendSuccess(res, plan);
}

// ── Get Active Plan for Player ──
export async function getActivePlan(req: AuthRequest, res: Response) {
  const plan = await mealPlanService.getActivePlan(req.params.playerId);
  sendSuccess(res, plan);
}

// ── Create ──
export async function create(req: AuthRequest, res: Response) {
  const plan = await mealPlanService.createMealPlan(req.body, req.user!.id);

  Promise.all([
    invalidateMultiple([
      CachePrefix.MEAL_PLANS,
      CachePrefix.WELLNESS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "CREATE",
      "meal-plans",
      plan!.id,
      buildAuditContext(req.user!, req.ip),
      `Meal plan created: ${plan!.title}`,
    ),
  ]).catch(() => {});

  sendCreated(res, plan, "Meal plan created");
}

// ── Update ──
export async function update(req: AuthRequest, res: Response) {
  const plan = await mealPlanService.updateMealPlan(req.params.id, req.body);

  Promise.all([
    invalidateMultiple([
      CachePrefix.MEAL_PLANS,
      CachePrefix.WELLNESS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "UPDATE",
      "meal-plans",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Meal plan updated",
    ),
  ]).catch(() => {});

  sendSuccess(res, plan, "Meal plan updated");
}

// ── Delete ──
export async function remove(req: AuthRequest, res: Response) {
  const result = await mealPlanService.deleteMealPlan(req.params.id);

  Promise.all([
    invalidateMultiple([
      CachePrefix.MEAL_PLANS,
      CachePrefix.WELLNESS,
      CachePrefix.DASHBOARD,
    ]),
    logAudit(
      "DELETE",
      "meal-plans",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Meal plan deleted",
    ),
  ]).catch(() => {});

  sendSuccess(res, result, "Meal plan deleted");
}

// ── Adherence Report ──
export async function adherenceReport(req: AuthRequest, res: Response) {
  const { dateFrom, dateTo } = req.query as {
    dateFrom?: string;
    dateTo?: string;
  };
  const data = await mealPlanService.getAdherenceReport(
    req.params.id,
    dateFrom,
    dateTo,
  );
  sendSuccess(res, data);
}
