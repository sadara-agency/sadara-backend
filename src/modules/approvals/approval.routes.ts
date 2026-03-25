import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import * as ctrl from "@modules/approvals/approval.controller";

const router = Router();
router.use(authenticate);

// ── Template Management (specific routes before :id) ──
router.get(
  "/templates",
  authorizeModule("approvals", "read"),
  dynamicFieldAccess("approvals"),
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
router.get(
  "/stats",
  authorizeModule("approvals", "read"),
  dynamicFieldAccess("approvals"),
  asyncHandler(ctrl.stats),
);
router.get(
  "/:id",
  authorizeModule("approvals", "read"),
  dynamicFieldAccess("approvals"),
  asyncHandler(ctrl.detail),
);
router.get(
  "/",
  authorizeModule("approvals", "read"),
  dynamicFieldAccess("approvals"),
  asyncHandler(ctrl.list),
);
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
