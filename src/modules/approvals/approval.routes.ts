import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "../../middleware/auth";
import * as ctrl from "./approval.controller";

const router = Router();
router.use(authenticate);

// ── Template Management (specific routes before :id) ──
router.get(
  "/templates",
  authorizeModule("approvals", "read"),
  asyncHandler(ctrl.listTemplates),
);
router.post(
  "/templates",
  authorize("Admin"),
  asyncHandler(ctrl.createTemplate),
);
router.put(
  "/templates/:id",
  authorize("Admin"),
  asyncHandler(ctrl.updateTemplate),
);
router.delete(
  "/templates/:id",
  authorize("Admin"),
  asyncHandler(ctrl.deactivateTemplate),
);

// ── Approval Requests ──
router.get("/stats", authorizeModule("approvals", "read"), asyncHandler(ctrl.stats));
router.get("/:id", authorizeModule("approvals", "read"), asyncHandler(ctrl.detail));
router.get("/", authorizeModule("approvals", "read"), asyncHandler(ctrl.list));
router.patch(
  "/:id/approve",
  authorizeModule("approvals", "update"),
  asyncHandler(ctrl.approve),
);
router.patch(
  "/:id/reject",
  authorizeModule("approvals", "update"),
  asyncHandler(ctrl.reject),
);

export default router;
