import type { Request, Response } from "express";
import { sendSuccess } from "@shared/utils/apiResponse";
import { invalidateByPrefix } from "@shared/utils/cache";
import { CachePrefix } from "@shared/utils/cache";
import { AuthRequest } from "@shared/types";
import * as service from "./scoutReport.service";

export async function listReports(req: Request, res: Response): Promise<void> {
  const { recommendation, limit, offset } = req.query as Record<string, string>;
  const result = await service.listScoutReports({
    recommendation,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  sendSuccess(res, result);
}

export async function getReport(req: Request, res: Response): Promise<void> {
  const report = await service.getScoutReport(req.params.watchlistId);
  sendSuccess(res, report);
}

export async function upsertReport(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const report = await service.upsertScoutReport(
    req.params.watchlistId,
    req.body,
    req.user!.id,
  );
  void invalidateByPrefix(CachePrefix.SCOUTING);
  sendSuccess(res, report, "Report saved");
}

export async function deleteReport(req: Request, res: Response): Promise<void> {
  const result = await service.deleteScoutReport(req.params.watchlistId);
  void invalidateByPrefix(CachePrefix.SCOUTING);
  sendSuccess(res, result, "Report deleted");
}

export async function similarProspects(
  req: Request,
  res: Response,
): Promise<void> {
  const similar = await service.getSimilarProspects(req.params.watchlistId);
  sendSuccess(res, similar);
}
