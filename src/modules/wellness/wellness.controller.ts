// ═══════════════════════════════════════════════════════════════
// src/modules/wellness/wellness.controller.ts
// ═══════════════════════════════════════════════════════════════

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
import { logger } from "@config/logger";
import * as svc from "./wellness.service";

const WELLNESS_CACHES = [CachePrefix.WELLNESS, CachePrefix.DASHBOARD];

// ══════════════════════════════════════════
// PROFILES (Coach / GymCoach)
// ══════════════════════════════════════════

export async function getProfile(req: AuthRequest, res: Response) {
  const profile = await svc.getProfile(req.params.playerId);
  sendSuccess(res, profile);
}

export async function createProfile(req: AuthRequest, res: Response) {
  const profile = await svc.createProfile(req.body, req.user!.id);
  sendCreated(res, profile);
  Promise.all([
    logAudit(
      "CREATE",
      "wellness",
      profile.id,
      buildAuditContext(req.user!, req.ip),
      `Created wellness profile for player ${req.body.playerId}`,
    ),
    invalidateMultiple(WELLNESS_CACHES),
  ]).catch((err) =>
    logger.warn("Post-create side-effects failed", {
      entity: "wellness",
      error: (err as Error).message,
    }),
  );
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const profile = await svc.updateProfile(req.params.playerId, req.body);
  sendSuccess(res, profile, "Profile updated");
  Promise.all([
    logAudit(
      "UPDATE",
      "wellness",
      profile.id,
      buildAuditContext(req.user!, req.ip),
      `Updated wellness profile for player ${req.params.playerId}`,
    ),
    invalidateMultiple(WELLNESS_CACHES),
  ]).catch((err) =>
    logger.warn("Post-update side-effects failed", {
      entity: "wellness",
      error: (err as Error).message,
    }),
  );
}

export async function computeMacros(req: AuthRequest, res: Response) {
  const result = await svc.computeMacros(req.params.playerId);
  sendSuccess(res, result);
}

export async function recalculateTargets(req: AuthRequest, res: Response) {
  const result = await svc.recalculateTargets(req.params.playerId);
  sendSuccess(res, result, "Targets recalculated");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

// ══════════════════════════════════════════
// WEIGHT LOGS (Coach + Player self-service)
// ══════════════════════════════════════════

export async function listWeightLogs(req: AuthRequest, res: Response) {
  const result = await svc.listWeightLogs(req.params.playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function createWeightLog(req: AuthRequest, res: Response) {
  const log = await svc.createWeightLog(req.body);
  sendCreated(res, log);
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function getWeightTrend(req: AuthRequest, res: Response) {
  const trend = await svc.getWeightTrend(req.params.playerId);
  sendSuccess(res, trend);
}

// ══════════════════════════════════════════
// PLAYER SELF-SERVICE
// ══════════════════════════════════════════

export async function myWeightLogs(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const result = await svc.listWeightLogs(playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function createMyWeightLog(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const log = await svc.createWeightLog({
    ...req.body,
    playerId,
  });
  sendCreated(res, log);
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function myWeightTrend(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, null, "Player account not linked");
    return;
  }
  const trend = await svc.getWeightTrend(playerId);
  sendSuccess(res, trend);
}

export async function myProfile(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, null, "Player account not linked");
    return;
  }
  const profile = await svc.getProfile(playerId);
  sendSuccess(res, profile);
}

export async function myMacros(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, null, "Player account not linked");
    return;
  }
  const result = await svc.computeMacros(playerId);
  sendSuccess(res, result);
}

// ══════════════════════════════════════════
// FOOD SEARCH & ITEMS
// ══════════════════════════════════════════

export async function searchFoods(req: AuthRequest, res: Response) {
  const query = (req.query.q as string) || "";
  const results = await svc.searchFoods(query);
  sendSuccess(res, results);
}

export async function getFoodItem(req: AuthRequest, res: Response) {
  const item = await svc.getFoodItem(req.params.id);
  sendSuccess(res, item);
}

export async function createFoodItem(req: AuthRequest, res: Response) {
  const item = await svc.createFoodItem(req.body);
  sendCreated(res, item);
  logAudit(
    "CREATE",
    "wellness",
    item.id,
    buildAuditContext(req.user!, req.ip),
    `Created custom food item: ${req.body.name}`,
  ).catch(() => {});
}

// ══════════════════════════════════════════
// MEAL LOGS (Coach view)
// ══════════════════════════════════════════

export async function listMealLogs(req: AuthRequest, res: Response) {
  const result = await svc.listMealLogs(req.params.playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function createMealLog(req: AuthRequest, res: Response) {
  const log = await svc.createMealLog(req.body);
  sendCreated(res, log);
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function updateMealLog(req: AuthRequest, res: Response) {
  const log = await svc.updateMealLog(req.params.id, req.body);
  sendSuccess(res, log, "Meal log updated");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function deleteMealLog(req: AuthRequest, res: Response) {
  await svc.deleteMealLog(req.params.id);
  sendSuccess(res, null, "Meal log deleted");
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function copyDay(req: AuthRequest, res: Response) {
  const meals = await svc.copyDay(req.body);
  sendCreated(res, meals);
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function getDailyTotals(req: AuthRequest, res: Response) {
  const date =
    (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const totals = await svc.getDailyTotals(req.params.playerId, date);
  sendSuccess(res, totals);
}

// ══════════════════════════════════════════
// PLAYER MEAL SELF-SERVICE
// ══════════════════════════════════════════

export async function myMealLogs(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, [], "Player account not linked");
    return;
  }
  const result = await svc.listMealLogs(playerId, req.query);
  sendPaginated(res, result.data, result.meta);
}

export async function createMyMealLog(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const log = await svc.createMealLog({ ...req.body, playerId });
  sendCreated(res, log);
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function copyMyDay(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    res
      .status(403)
      .json({ success: false, message: "Player account not linked" });
    return;
  }
  const meals = await svc.copyDay({ ...req.body, playerId });
  sendCreated(res, meals);
  invalidateMultiple(WELLNESS_CACHES).catch(() => {});
}

export async function myDailyTotals(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, null, "Player account not linked");
    return;
  }
  const date =
    (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const totals = await svc.getDailyTotals(playerId, date);
  sendSuccess(res, totals);
}

// ══════════════════════════════════════════
// DASHBOARD (Phase 4)
// ══════════════════════════════════════════

export async function playerDashboard(req: AuthRequest, res: Response) {
  const days = Number(req.query.days) || 7;
  const data = await svc.getPlayerDashboard(req.params.playerId, days);
  sendSuccess(res, data);
}

export async function coachOverview(req: AuthRequest, res: Response) {
  const data = await svc.getCoachOverview();
  sendSuccess(res, data);
}

export async function coachHeatmap(req: AuthRequest, res: Response) {
  const days = Number(req.query.days) || 14;
  const data = await svc.getHeatmapData(days);
  sendSuccess(res, data);
}

export async function myDashboard(req: AuthRequest, res: Response) {
  const playerId = (req.user as any)?.playerId;
  if (!playerId) {
    sendSuccess(res, null, "Player account not linked");
    return;
  }
  const days = Number(req.query.days) || 7;
  const data = await svc.getPlayerDashboard(playerId, days);
  sendSuccess(res, data);
}
