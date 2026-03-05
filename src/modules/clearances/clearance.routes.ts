// ─────────────────────────────────────────────────────────────
// src/modules/clearances/clearance.routes.ts
// Express routes for clearance (مخالصة) endpoints.
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import * as controller from "./clearance.controller";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createClearanceSchema,
  updateClearanceSchema,
  completeClearanceSchema,
  clearanceQuerySchema,
} from "./clearance.schema";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET    /api/v1/clearances          — List all clearances
router.get(
  "/",
  authorizeModule("contracts", "read"),
  validate(clearanceQuerySchema, "query"),
  controller.list,
);

// GET    /api/v1/clearances/:id      — Get single clearance
router.get("/:id", authorizeModule("contracts", "read"), controller.getById);

// POST   /api/v1/clearances          — Create new clearance
router.post(
  "/",
  authorizeModule("contracts", "create"),
  validate(createClearanceSchema),
  controller.create,
);

// PUT    /api/v1/clearances/:id      — Update clearance
router.put(
  "/:id",
  authorizeModule("contracts", "update"),
  validate(updateClearanceSchema),
  controller.update,
);

// POST   /api/v1/clearances/:id/complete — Sign & complete clearance
router.post(
  "/:id/complete",
  authorizeModule("contracts", "update"),
  validate(completeClearanceSchema),
  controller.complete,
);

// DELETE /api/v1/clearances/:id      — Delete clearance (Processing only)
router.delete("/:id", authorizeModule("contracts", "delete"), controller.remove);

export default router;
