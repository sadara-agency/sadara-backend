import { Router } from "express";
import { authenticate, authorize, authorizeModule } from "@middleware/auth";
import { playerCareController } from "./playercare.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Read ──

router.get(
  "/",
  authorizeModule("referrals", "read"),
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
  authorizeModule("referrals", "read"),
  playerCareController.timeline,
);

router.get(
  "/:id",
  authorizeModule("referrals", "read"),
  playerCareController.getById,
);

// ── Write ──

router.post(
  "/",
  authorizeModule("referrals", "create"),
  playerCareController.create,
);

router.post(
  "/medical",
  authorizeModule("injuries", "create"),
  playerCareController.createMedical,
);

router.patch(
  "/:id",
  authorizeModule("referrals", "update"),
  playerCareController.update,
);

router.patch(
  "/:id/status",
  authorizeModule("referrals", "update"),
  playerCareController.updateStatus,
);

// ── Delete ──

router.delete(
  "/:id",
  authorizeModule("referrals", "delete"),
  playerCareController.delete,
);

export default router;
