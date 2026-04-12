import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createInjuryFinancialsSchema,
  updateInjuryFinancialsSchema,
  injuryFinancialsQuerySchema,
} from "./injuryFinancials.validation";
import * as ctrl from "./injuryFinancials.controller";

const router = Router({ mergeParams: true });
router.use(authenticate);

// GET /api/v1/injuries/financials
router.get(
  "/",
  authorizeModule("injury-financials", "read"),
  validate(injuryFinancialsQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

// GET /api/v1/injuries/financials/:id
router.get(
  "/:id",
  authorizeModule("injury-financials", "read"),
  asyncHandler(ctrl.getById),
);

// GET /api/v1/injuries/financials/by-injury/:injuryId
router.get(
  "/by-injury/:injuryId",
  authorizeModule("injury-financials", "read"),
  asyncHandler(ctrl.getByInjury),
);

// POST /api/v1/injuries/financials/compute/:injuryId — auto-compute from injury + contract data
router.post(
  "/compute/:injuryId",
  authorizeModule("injury-financials", "create"),
  asyncHandler(ctrl.compute),
);

// POST /api/v1/injuries/financials
router.post(
  "/",
  authorizeModule("injury-financials", "create"),
  validate(createInjuryFinancialsSchema),
  asyncHandler(ctrl.create),
);

// PATCH /api/v1/injuries/financials/:id
router.patch(
  "/:id",
  authorizeModule("injury-financials", "update"),
  validate(updateInjuryFinancialsSchema),
  asyncHandler(ctrl.update),
);

// DELETE /api/v1/injuries/financials/:id
router.delete(
  "/:id",
  authorizeModule("injury-financials", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
