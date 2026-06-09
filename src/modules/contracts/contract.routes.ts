import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  createContractSchema,
  updateContractSchema,
  contractQuerySchema,
  transitionStatusSchema,
  terminateContractSchema,
} from "@modules/contracts/contract.validation";
import * as contractController from "@modules/contracts/contract.controller";
import * as templateController from "@modules/contracts/contractTemplate.controller";
import {
  createContractTemplateSchema,
  updateContractTemplateSchema,
  previewTemplatePdfSchema,
} from "@modules/contracts/contractTemplate.validation";
import { transitionContract } from "@modules/contracts/contract.transition.controller";
import { generatePdf } from "@modules/contracts/contract.pdf.controller";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import { uploadSignedContract } from "@modules/contracts/contract.controller";

const router = Router();
router.use(authenticate);

// ── Contract Templates (must come before /:id routes) ──
router.get(
  "/templates",
  authorizeModule("contracts", "read"),
  asyncHandler(templateController.listTemplates),
);
router.post(
  "/templates",
  authorize("Admin", "Manager", "SportingDirector", "Executive", "Legal"),
  validate(createContractTemplateSchema),
  asyncHandler(templateController.createTemplate),
);
router.put(
  "/templates/:id",
  authorize("Admin", "Manager", "SportingDirector", "Executive", "Legal"),
  validate(updateContractTemplateSchema),
  asyncHandler(templateController.updateTemplate),
);
router.delete(
  "/templates/:id",
  authorize("Admin", "Manager", "SportingDirector", "Executive", "Legal"),
  asyncHandler(templateController.deactivateTemplate),
);
router.post(
  "/templates/:id/preview-pdf",
  authorize("Admin", "Manager", "SportingDirector", "Executive", "Legal"),
  validate(previewTemplatePdfSchema),
  asyncHandler(templateController.previewTemplatePdf),
);

// ── Read (cached) ──
router.get(
  "/",
  authorizeModule("contracts", "read"),
  validate(contractQuerySchema, "query"),
  dynamicFieldAccess("contracts"),
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
router.get(
  "/:id/history",
  authorizeModule("contracts", "read"),
  asyncHandler(contractController.getHistory),
);
router.get(
  "/:id/pdf",
  authorizeModule("contracts", "read"),
  asyncHandler(generatePdf),
);
router.post(
  "/:id/upload-signed",
  authorizeModule("contracts", "create"),
  uploadSingle,
  verifyFileType,
  asyncHandler(uploadSignedContract),
);
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
  dynamicFieldAccess("contracts"),
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
