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
import * as svc from "./tacticalReport.service";

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.listTacticalReports(req.query as any);
  sendPaginated(res, result.data, result.meta);
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.getTacticalReportById(req.params.id);
  sendSuccess(res, record);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.createTacticalReport(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([CachePrefix.TACTICAL_REPORTS, CachePrefix.TACTICAL]),
    logAudit(
      "CREATE",
      "tactical_reports",
      record.id,
      buildAuditContext(req.user!, req.ip),
      `Tactical report created: ${record.title}`,
    ),
  ]).catch(() => {});
  sendCreated(res, record);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.updateTacticalReport(req.params.id, req.body);
  Promise.all([
    invalidateMultiple([CachePrefix.TACTICAL_REPORTS, CachePrefix.TACTICAL]),
    logAudit(
      "UPDATE",
      "tactical_reports",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Tactical report updated",
    ),
  ]).catch(() => {});
  sendSuccess(res, record);
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await svc.deleteTacticalReport(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.TACTICAL_REPORTS, CachePrefix.TACTICAL]),
    logAudit(
      "DELETE",
      "tactical_reports",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Tactical report deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
});

export const publish = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await svc.publishTacticalReport(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.TACTICAL_REPORTS]),
    logAudit(
      "UPDATE",
      "tactical_reports",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Tactical report published",
    ),
  ]).catch(() => {});
  sendSuccess(res, record);
});

export const autoGenerate = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { playerId, month, year } = req.body;
    const record = await svc.autoGenerateMonthlyReport(
      playerId,
      month,
      year,
      req.user!.id,
    );
    Promise.all([
      invalidateMultiple([CachePrefix.TACTICAL_REPORTS]),
      logAudit(
        "CREATE",
        "tactical_reports",
        record.id,
        buildAuditContext(req.user!, req.ip),
        `Auto-generated report for ${month}/${year}`,
      ),
    ]).catch(() => {});
    sendCreated(res, record);
  },
);
