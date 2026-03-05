import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createGateSchema,
  updateGateSchema,
  advanceGateSchema,
  initializeGateSchema,
  createChecklistItemSchema,
  toggleChecklistItemSchema,
  gateQuerySchema,
} from "./gate.schema";
import * as gateController from "./gate.controller";

const router = Router();
router.use(authenticate);

// ── Gates CRUD ──
router.get(
  "/",
  authorizeModule("gates", "read"),
  validate(gateQuerySchema, "query"),
  asyncHandler(gateController.list),
);

// Static paths MUST come before /:id to avoid Express matching "initialize" or "player" as an :id param
router.post(
  "/initialize",
  authorizeModule("gates", "create"),
  validate(initializeGateSchema),
  asyncHandler(gateController.initialize),
);
router.get("/player/:playerId", authorizeModule("gates", "read"), asyncHandler(gateController.getPlayerGates));

router.get("/:id", authorizeModule("gates", "read"), asyncHandler(gateController.getById));
router.post(
  "/",
  authorizeModule("gates", "create"),
  validate(createGateSchema),
  asyncHandler(gateController.create),
);
router.patch(
  "/:id",
  authorizeModule("gates", "update"),
  validate(updateGateSchema),
  asyncHandler(gateController.update),
);
router.patch(
  "/:id/advance",
  authorizeModule("gates", "update"),
  validate(advanceGateSchema),
  asyncHandler(gateController.advance),
);
router.delete("/:id", authorizeModule("gates", "delete"), asyncHandler(gateController.remove));

// ── Checklist Items ──
router.post(
  "/:gateId/checklist",
  authorizeModule("gates", "create"),
  validate(createChecklistItemSchema),
  asyncHandler(gateController.addChecklistItem),
);
router.patch(
  "/checklist/:itemId",
  authorizeModule("gates", "update"),
  validate(toggleChecklistItemSchema),
  asyncHandler(gateController.toggleChecklistItem),
);
router.delete(
  "/checklist/:itemId",
  authorizeModule("gates", "delete"),
  asyncHandler(gateController.deleteChecklistItem),
);

export default router;
