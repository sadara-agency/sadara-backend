import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
} from "@modules/calendar/event.schema";
import * as eventController from "@modules/calendar/event.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("calendar", "read"),
  validate(eventQuerySchema, "query"),
  asyncHandler(eventController.list),
);
router.get(
  "/:id",
  authorizeModule("calendar", "read"),
  asyncHandler(eventController.getById),
);

// ── Write ──
router.post(
  "/",
  authorizeModule("calendar", "create"),
  validate(createEventSchema),
  asyncHandler(eventController.create),
);
router.patch(
  "/:id",
  authorizeModule("calendar", "update"),
  validate(updateEventSchema),
  asyncHandler(eventController.update),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("calendar", "delete"),
  asyncHandler(eventController.remove),
);

export default router;
