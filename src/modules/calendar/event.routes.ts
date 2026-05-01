import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { attachCalendarScope } from "@middleware/calendarScope";
import {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
} from "@modules/calendar/event.validation";
import * as eventController from "@modules/calendar/event.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("calendar", "read"),
  validate(eventQuerySchema, "query"),
  asyncHandler(attachCalendarScope),
  asyncHandler(eventController.list),
);
// ── Admin debug: inspect resolved scope for a user ──
router.get(
  "/scope",
  authorizeModule("calendar", "read"),
  asyncHandler(attachCalendarScope),
  asyncHandler(eventController.getScope),
);

router.get(
  "/source/:sourceType/:sourceId",
  authorizeModule("calendar", "read"),
  asyncHandler(eventController.getSourceDetail),
);
router.get(
  "/:id",
  authorizeModule("calendar", "read"),
  dynamicFieldAccess("calendar"),
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
