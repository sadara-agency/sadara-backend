import { Response } from "express";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import type { AuthRequest } from "@shared/types";
import * as svc from "./matchAnalytics.service";

export async function kpiDashboard(req: AuthRequest, res: Response) {
  const data = await svc.getPlayerKpiDashboard(req.query as any);
  sendSuccess(res, data);
}

export async function statTrend(req: AuthRequest, res: Response) {
  const data = await svc.getPlayerStatTrend(req.query as any);
  sendSuccess(res, data);
}

export async function benchmarkCompare(req: AuthRequest, res: Response) {
  const data = await svc.comparePlayerToBenchmark(req.query as any);
  sendSuccess(res, data);
}

export async function seasonSummary(req: AuthRequest, res: Response) {
  const data = await svc.getSeasonSummary(req.query as any);
  sendSuccess(res, data);
}

// ── Benchmark CRUD ──

export async function listBenchmarks(req: AuthRequest, res: Response) {
  const result = await svc.listBenchmarks(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

export async function upsertBenchmark(req: AuthRequest, res: Response) {
  const record = await svc.upsertBenchmark(req.body, req.user!.id);
  Promise.all([
    invalidateMultiple([
      CachePrefix.POSITIONAL_BENCHMARKS,
      CachePrefix.MATCH_ANALYTICS,
    ]),
    logAudit(
      "CREATE",
      "positional_benchmarks",
      record.id,
      buildAuditContext(req.user!, req.ip),
      `Benchmark upserted: ${record.position}/${record.stat}`,
    ),
  ]).catch(() => {});
  sendCreated(res, record);
}

export async function deleteBenchmark(req: AuthRequest, res: Response) {
  const result = await svc.deleteBenchmark(req.params.id);
  Promise.all([
    invalidateMultiple([CachePrefix.POSITIONAL_BENCHMARKS]),
    logAudit(
      "DELETE",
      "positional_benchmarks",
      req.params.id,
      buildAuditContext(req.user!, req.ip),
      "Benchmark deleted",
    ),
  ]).catch(() => {});
  sendSuccess(res, result);
}
