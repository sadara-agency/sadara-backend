import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { asyncHandler } from "@middleware/errorHandler";
import {
  createSalaryBenchmarkSchema,
  updateSalaryBenchmarkSchema,
  listSalaryBenchmarksSchema,
} from "./salaryBenchmark.validation";
import * as ctrl from "./salaryBenchmark.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("salary_benchmarks", "read"),
  validate(listSalaryBenchmarksSchema, "query"),
  dynamicFieldAccess("salary_benchmarks"),
  cacheRoute("salary_benchmarks", CacheTTL.MEDIUM),
  ctrl.list,
);

router.get(
  "/by-position",
  authorizeModule("salary_benchmarks", "read"),
  cacheRoute("salary_benchmarks", CacheTTL.MEDIUM),
  asyncHandler(ctrl.byPosition),
);

router.get(
  "/:id",
  authorizeModule("salary_benchmarks", "read"),
  dynamicFieldAccess("salary_benchmarks"),
  cacheRoute("salary_benchmarks", CacheTTL.MEDIUM),
  ctrl.getById,
);

router.post(
  "/",
  authorizeModule("salary_benchmarks", "create"),
  validate(createSalaryBenchmarkSchema),
  ctrl.create,
);

router.patch(
  "/:id",
  authorizeModule("salary_benchmarks", "update"),
  validate(updateSalaryBenchmarkSchema),
  ctrl.update,
);

router.delete(
  "/:id",
  authorizeModule("salary_benchmarks", "delete"),
  ctrl.remove,
);

export default router;
