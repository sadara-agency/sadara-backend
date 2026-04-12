import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createRtpProtocolSchema,
  updateRtpProtocolSchema,
  advancePhaseSchema,
  rtpQuerySchema,
} from "./rtp.validation";
import * as ctrl from "./rtp.controller";

const router = Router({ mergeParams: true });
router.use(authenticate);

// GET /api/v1/injuries/rtp
router.get(
  "/",
  authorizeModule("rtp", "read"),
  validate(rtpQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

// GET /api/v1/injuries/rtp/:id
router.get("/:id", authorizeModule("rtp", "read"), asyncHandler(ctrl.getById));

// GET /api/v1/injuries/rtp/by-injury/:injuryId
router.get(
  "/by-injury/:injuryId",
  authorizeModule("rtp", "read"),
  asyncHandler(ctrl.getByInjury),
);

// POST /api/v1/injuries/rtp
router.post(
  "/",
  authorizeModule("rtp", "create"),
  validate(createRtpProtocolSchema),
  asyncHandler(ctrl.create),
);

// PATCH /api/v1/injuries/rtp/:id
router.patch(
  "/:id",
  authorizeModule("rtp", "update"),
  validate(updateRtpProtocolSchema),
  asyncHandler(ctrl.update),
);

// POST /api/v1/injuries/rtp/:id/advance
router.post(
  "/:id/advance",
  authorizeModule("rtp", "update"),
  validate(advancePhaseSchema),
  asyncHandler(ctrl.advancePhase),
);

// DELETE /api/v1/injuries/rtp/:id
router.delete(
  "/:id",
  authorizeModule("rtp", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
