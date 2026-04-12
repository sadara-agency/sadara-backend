import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { authorizePlayerPackage } from "@middleware/packageAccess";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { validate } from "@middleware/validate";
import {
  createSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
} from "./session.validation";
import * as sessionController from "./session.controller";
import feedbackRoutes from "./feedback/sessionFeedback.routes";
import * as feedbackController from "./feedback/sessionFeedback.controller";

const router = Router();
router.use(authenticate);

// ── Manager Dashboard (before /:id routes) ──
router.get(
  "/manager/dashboard",
  authorizeModule("sessions", "read"),
  cacheRoute("sessions:manager:dashboard", CacheTTL.MEDIUM),
  asyncHandler(sessionController.getManagerDashboard),
);

// ── Read ──
router.get(
  "/",
  authorizeModule("sessions", "read"),
  dynamicFieldAccess("sessions"),
  cacheRoute("sessions", CacheTTL.MEDIUM),
  validate(sessionQuerySchema, "query"),
  asyncHandler(sessionController.list),
);
router.get(
  "/stats",
  authorizeModule("sessions", "read"),
  cacheRoute("sessions-stats", CacheTTL.SHORT),
  asyncHandler(sessionController.stats),
);
router.get(
  "/referral/:referralId",
  authorizeModule("sessions", "read"),
  validate(sessionQuerySchema, "query"),
  dynamicFieldAccess("sessions"),
  cacheRoute("sessions", CacheTTL.MEDIUM),
  asyncHandler(sessionController.listByReferral),
);
router.get(
  "/player/:playerId",
  authorizeModule("sessions", "read"),
  authorizePlayerPackage("sessions", "read"),
  validate(sessionQuerySchema, "query"),
  dynamicFieldAccess("sessions"),
  cacheRoute("sessions", CacheTTL.MEDIUM),
  asyncHandler(sessionController.listByPlayer),
);
router.get(
  "/:id",
  authorizeModule("sessions", "read"),
  dynamicFieldAccess("sessions"),
  cacheRoute("session", CacheTTL.MEDIUM),
  asyncHandler(sessionController.getById),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("sessions", "create"),
  authorizePlayerPackage("sessions", "create"),
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

// ── Feedback sub-routes ──
router.use("/:sessionId/feedback", feedbackRoutes);

// ── Player Feedback Summary ──
router.get(
  "/player/:playerId/feedback-summary",
  authorizeModule("session-feedback", "read"),
  cacheRoute("session-feedback", CacheTTL.MEDIUM),
  asyncHandler(feedbackController.playerSummary),
);

export default router;
