import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
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

// Stats are scoped per role in the service layer — bypass roles get org-wide
// aggregates; coaches/analysts get stats scoped to their assigned players.
router.get(
  "/stats",
  authorizeModule("playercare", "read"),
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
