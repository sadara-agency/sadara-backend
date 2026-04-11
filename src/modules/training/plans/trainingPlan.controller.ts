import { Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { asyncHandler } from "@middleware/errorHandler";
import type { AuthRequest } from "@shared/types";
import * as svc from "./trainingPlan.service";

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.listTrainingPlans(req.query as any);
  sendPaginated(res, result.data, result.meta);
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const plan = await svc.getTrainingPlanById(req.params.id);
  sendSuccess(res, plan);
});

export const getActive = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const plan = await svc.getActivePlan(req.params.playerId);
    sendSuccess(res, plan);
  },
);

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const plan = await svc.createTrainingPlan(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([CachePrefix.TRAINING_PLANS, CachePrefix.DASHBOARD]),
    logAudit(
      "CREATE",
      "training_plans",
      plan.id,
      buildAuditContext(req.user!, req.ip),
      `Training plan: ${plan.title}`,
    ),
  ]).catch(() => {});
  sendCreated(res, plan);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const plan = await svc.updateTrainingPlan(req.params.id, req.body);
  Promise.all([
    invalidateMultiple([CachePrefix.TRAINING_PLANS]),
    logAudit(
      "UPDATE",
      "training_plans",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Training plan updated",
    ),
  ]).catch(() => {});
  sendSuccess(res, plan);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.deleteTrainingPlan(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.TRAINING_PLANS, CachePrefix.DASHBOARD]),
    logAudit(
      "DELETE",
      "training_plans",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Training plan deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
});

export const upsertWeek = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const week = await svc.upsertWeek(req.params.id, req.body);
    invalidateMultiple([CachePrefix.TRAINING_PLANS]).catch(() => {});
    sendSuccess(res, week);
  },
);

export const logProgress = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const log = await svc.logWeekProgress(
      req.params.id,
      req.body,
      req.user!.id,
    );
    Promise.all([
      invalidateMultiple([CachePrefix.TRAINING_PLANS]),
      logAudit(
        "CREATE",
        "training_plan_progress",
        log.id,
        buildAuditContext(req.user!, req.ip),
        `Progress logged: week ${log.weekNumber}`,
      ),
    ]).catch(() => {});
    sendCreated(res, log);
  },
);

export const progressionReport = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const report = await svc.getProgressionReport(req.params.id);
    sendSuccess(res, report);
  },
);

export const progressLogs = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const logs = await svc.listProgressLogs(req.params.id);
    sendSuccess(res, logs);
  },
);
