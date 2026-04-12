import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  kpiDashboardQuerySchema,
  statTrendQuerySchema,
  benchmarkCompareQuerySchema,
  seasonSummaryQuerySchema,
  createBenchmarkSchema,
  benchmarkQuerySchema,
} from "./matchAnalytics.validation";
import * as ctrl from "./matchAnalytics.controller";

const router = Router({ mergeParams: true });
router.use(authenticate);

// ── Read-only analytics ──

router.get(
  "/kpi",
  authorizeModule("match-analytics", "read"),
  validate(kpiDashboardQuerySchema, "query"),
  cacheRoute("match-analytics-kpi", CacheTTL.MEDIUM),
  asyncHandler(ctrl.kpiDashboard),
);

router.get(
  "/trend",
  authorizeModule("match-analytics", "read"),
  validate(statTrendQuerySchema, "query"),
  cacheRoute("match-analytics-trend", CacheTTL.MEDIUM),
  asyncHandler(ctrl.statTrend),
);

router.get(
  "/benchmark",
  authorizeModule("match-analytics", "read"),
  validate(benchmarkCompareQuerySchema, "query"),
  cacheRoute("match-analytics-benchmark", CacheTTL.MEDIUM),
  asyncHandler(ctrl.benchmarkCompare),
);

router.get(
  "/season",
  authorizeModule("match-analytics", "read"),
  validate(seasonSummaryQuerySchema, "query"),
  cacheRoute("match-analytics-season", CacheTTL.MEDIUM),
  asyncHandler(ctrl.seasonSummary),
);

// ── Positional Benchmarks CRUD ──

router.get(
  "/benchmarks",
  authorizeModule("match-analytics", "read"),
  validate(benchmarkQuerySchema, "query"),
  cacheRoute("positional-benchmarks", CacheTTL.LONG),
  asyncHandler(ctrl.listBenchmarks),
);

router.post(
  "/benchmarks",
  authorizeModule("match-analytics", "create"),
  validate(createBenchmarkSchema),
  asyncHandler(ctrl.upsertBenchmark),
);

router.delete(
  "/benchmarks/:id",
  authorizeModule("match-analytics", "delete"),
  asyncHandler(ctrl.deleteBenchmark),
);

export default router;
