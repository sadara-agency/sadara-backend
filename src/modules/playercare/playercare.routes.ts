import { Router } from "express";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { playerCareController } from "./playercare.controller";
import {
  createCaseSchema,
  createMedicalCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
  caseIdSchema,
  playerIdSchema,
} from "./playercare.validation";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Read ──

router.get(
  "/",
  authorizeModule("playercare", "read"),
  dynamicFieldAccess("playercare"),
  playerCareController.list,
);

// Stats aggregates across all referrals org-wide. Restricted to bypass
// roles because scoped aggregates would be misleading for coaches/analysts.
router.get(
  "/stats",
  authorize("Admin", "Manager", "Executive"),
  playerCareController.stats,
);

router.get(
  "/player/:playerId/timeline",
  authorizeModule("playercare", "read"),
  validate(playerIdSchema, "params"),
  dynamicFieldAccess("playercare"),
  playerCareController.timeline,
);

router.get(
  "/:id",
  authorizeModule("playercare", "read"),
  validate(caseIdSchema, "params"),
  dynamicFieldAccess("playercare"),
  playerCareController.getById,
);

// ── Write ──

router.post(
  "/",
  authorizeModule("playercare", "create"),
  validate(createCaseSchema),
  playerCareController.create,
);

router.post(
  "/medical",
  authorizeModule("playercare", "create"),
  validate(createMedicalCaseSchema),
  playerCareController.createMedical,
);

router.patch(
  "/:id",
  authorizeModule("playercare", "update"),
  validate(updateCaseSchema),
  playerCareController.update,
);

router.patch(
  "/:id/status",
  authorizeModule("playercare", "update"),
  validate(updateCaseStatusSchema),
  playerCareController.updateStatus,
);

// ── Delete ──

router.delete(
  "/:id",
  authorizeModule("playercare", "delete"),
  playerCareController.delete,
);

export default router;
