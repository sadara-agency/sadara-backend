import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorize } from "../../middleware/auth";
import * as ctrl from "./approval.controller";

const router = Router();
router.use(authenticate);

router.get("/", asyncHandler(ctrl.list));
router.get("/stats", asyncHandler(ctrl.stats));
router.patch(
  "/:id/approve",
  authorize("Admin", "Manager"),
  asyncHandler(ctrl.approve),
);
router.patch(
  "/:id/reject",
  authorize("Admin", "Manager"),
  asyncHandler(ctrl.reject),
);

export default router;
