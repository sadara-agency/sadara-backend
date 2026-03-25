import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import * as auditController from "@modules/audit/audit.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("audit", "read"),
  dynamicFieldAccess("audit"),
  asyncHandler(auditController.list),
);

export default router;
