import { Router } from "express";
import { authenticate, authorizeModule, authorize } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL, CachePrefix } from "@shared/utils/cache";
import { asyncHandler } from "@middleware/errorHandler";
import {
  triggerGateSchema,
  resolveGateSchema,
  listGatesSchema,
} from "./governanceGate.validation";
import * as ctrl from "./governanceGate.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("governance_gates", "read"),
  validate(listGatesSchema, "query"),
  cacheRoute(CachePrefix.GOVERNANCE_GATES, CacheTTL.SHORT),
  asyncHandler(ctrl.list),
);

// Admin-only: tamper-evidence check — must come before /:id to avoid param capture
router.get("/verify-chain", authorize("Admin"), asyncHandler(ctrl.verifyChain));

router.get(
  "/:id",
  authorizeModule("governance_gates", "read"),
  cacheRoute(CachePrefix.GOVERNANCE_GATES, CacheTTL.SHORT),
  asyncHandler(ctrl.getById),
);

router.post(
  "/",
  authorizeModule("governance_gates", "create"),
  validate(triggerGateSchema),
  asyncHandler(ctrl.trigger),
);

router.patch(
  "/:id/resolve",
  authorizeModule("governance_gates", "update"),
  validate(resolveGateSchema),
  asyncHandler(ctrl.resolve),
);

router.delete(
  "/:id",
  authorizeModule("governance_gates", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
