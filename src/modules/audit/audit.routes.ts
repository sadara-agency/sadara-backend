import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import * as auditController from "@modules/audit/audit.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("audit", "read"),
  asyncHandler(auditController.list),
);

export default router;
