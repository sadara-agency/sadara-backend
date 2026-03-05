import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { cacheRoute } from "../../middleware/cache.middleware";
import { CacheTTL } from "../../shared/utils/cache";
import {
  createContractSchema,
  updateContractSchema,
  contractQuerySchema,
  transitionStatusSchema,
  terminateContractSchema,
} from "./contract.schema";
import * as contractController from "./contract.controller";
import { transitionContract } from "./contract.transition.controller";
import { generatePdf } from "./contract.pdf.controller";
import {
  fieldAccess,
  CONTRACT_HIDDEN_FIELDS,
} from "../../middleware/fieldAccess";

const router = Router();
router.use(authenticate);

// ── Read (cached) ──
router.get(
  "/",
  authorizeModule("contracts", "read"),
  validate(contractQuerySchema, "query"),
  fieldAccess(CONTRACT_HIDDEN_FIELDS),
  cacheRoute("contracts", CacheTTL.MEDIUM),
  asyncHandler(contractController.list),
);

// ── Write ──
router.post(
  "/",
  authorizeModule("contracts", "create"),
  validate(createContractSchema),
  asyncHandler(contractController.create),
);

// ── Sub-resource routes MUST come before /:id ──
router.get("/:id/pdf", authorizeModule("contracts", "read"), asyncHandler(generatePdf));
router.post(
  "/:id/transition",
  authorizeModule("contracts", "create"),
  validate(transitionStatusSchema),
  asyncHandler(transitionContract),
);
router.post(
  "/:id/terminate",
  authorizeModule("contracts", "create"),
  validate(terminateContractSchema),
  asyncHandler(contractController.terminate),
);

// ── Single resource ──
router.get(
  "/:id",
  authorizeModule("contracts", "read"),
  cacheRoute("contracts", CacheTTL.MEDIUM),
  asyncHandler(contractController.getById),
);
router.patch(
  "/:id",
  authorizeModule("contracts", "update"),
  validate(updateContractSchema),
  asyncHandler(contractController.update),
);
router.delete(
  "/:id",
  authorizeModule("contracts", "delete"),
  asyncHandler(contractController.remove),
);

export default router;
