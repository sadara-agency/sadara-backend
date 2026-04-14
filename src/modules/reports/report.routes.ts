import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CachePrefix, CacheTTL } from "@shared/utils/cache";
import {
  createReportSchema,
  reportQuerySchema,
} from "@modules/reports/report.validation";
import * as ctrl from "@modules/reports/report.controller";

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("reports"));

// Predefined reports (must be before /:id to avoid route conflicts)
router.get(
  "/player-portfolio",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.playerPortfolio),
);
router.get(
  "/contract-commission",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.contractCommission),
);
router.get(
  "/injury-summary",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.injurySummary),
);
router.get(
  "/match-tasks",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.matchTasks),
);
router.get(
  "/financial-summary",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.financialSummary),
);
router.get(
  "/upcoming-matches-tasks",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.upcomingMatchesTasks),
);
router.get(
  "/scouting-pipeline",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.scoutingPipeline),
);
router.get(
  "/expiring-contracts",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.expiringContracts),
);

// Export endpoints (must be before /:id to avoid route conflicts)
router.get(
  "/:type/xlsx",
  authorizeModule("reports", "read"),
  asyncHandler(ctrl.exportXlsx),
);
router.get(
  "/:type/pdf",
  authorizeModule("reports", "read"),
  asyncHandler(ctrl.exportPdf),
);

// Technical reports CRUD
router.get(
  "/",
  authorizeModule("reports", "read"),
  validate(reportQuerySchema, "query"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.list),
);
router.get(
  "/:id",
  authorizeModule("reports", "read"),
  cacheRoute(CachePrefix.REPORTS, CacheTTL.MEDIUM),
  asyncHandler(ctrl.getById),
);
router.get(
  "/:id/download",
  authorizeModule("reports", "read"),
  asyncHandler(ctrl.download),
);
router.post(
  "/",
  authorizeModule("reports", "create"),
  validate(createReportSchema),
  asyncHandler(ctrl.create),
);
router.delete(
  "/:id",
  authorizeModule("reports", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
