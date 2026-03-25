// ─────────────────────────────────────────────────────────────
// src/modules/clearances/clearance.routes.ts
// Express routes for clearance (مخالصة) endpoints.
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import * as controller from "@modules/clearances/clearance.controller";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createClearanceSchema,
  updateClearanceSchema,
  completeClearanceSchema,
  clearanceQuerySchema,
} from "@modules/clearances/clearance.schema";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET    /api/v1/clearances          — List all clearances
router.get(
  "/",
  authorizeModule("contracts", "read"),
  validate(clearanceQuerySchema, "query"),
  asyncHandler(controller.list),
);

// GET    /api/v1/clearances/:id      — Get single clearance
router.get(
  "/:id",
  authorizeModule("contracts", "read"),
  asyncHandler(controller.getById),
);

// POST   /api/v1/clearances          — Create new clearance
router.post(
  "/",
  authorizeModule("contracts", "create"),
  validate(createClearanceSchema),
  asyncHandler(controller.create),
);

// PUT    /api/v1/clearances/:id      — Update clearance
router.put(
  "/:id",
  authorizeModule("contracts", "update"),
  validate(updateClearanceSchema),
  asyncHandler(controller.update),
);

// POST   /api/v1/clearances/:id/complete — Sign & complete clearance
router.post(
  "/:id/complete",
  authorizeModule("contracts", "update"),
  validate(completeClearanceSchema),
  asyncHandler(controller.complete),
);

// DELETE /api/v1/clearances/:id      — Delete clearance (Processing only)
router.delete(
  "/:id",
  authorizeModule("contracts", "delete"),
  asyncHandler(controller.remove),
);

export default router;
