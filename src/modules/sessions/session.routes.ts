import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
} from "./session.validation";
import * as sessionController from "./session.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("sessions", "read"),
  validate(sessionQuerySchema, "query"),
  asyncHandler(sessionController.list),
);
router.get(
  "/stats",
  authorizeModule("sessions", "read"),
  asyncHandler(sessionController.stats),
);
router.get(
  "/referral/:referralId",
  authorizeModule("sessions", "read"),
  asyncHandler(sessionController.listByReferral),
);
router.get(
  "/player/:playerId",
  authorizeModule("sessions", "read"),
  asyncHandler(sessionController.listByPlayer),
);
router.get(
  "/:id",
  authorizeModule("sessions", "read"),
  asyncHandler(sessionController.getById),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("sessions", "create"),
  validate(createSessionSchema),
  asyncHandler(sessionController.create),
);

// ── Update ──
router.patch(
  "/:id",
  authorizeModule("sessions", "update"),
  validate(updateSessionSchema),
  asyncHandler(sessionController.update),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("sessions", "delete"),
  asyncHandler(sessionController.remove),
);

export default router;
