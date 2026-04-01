import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createMediaContactSchema,
  updateMediaContactSchema,
  mediaContactQuerySchema,
} from "./mediaContact.validation";
import * as mediaContactController from "./mediaContact.controller";

const router = Router();
router.use(authenticate);

// ── List & Read ──
router.get(
  "/",
  authorizeModule("media_contacts", "read"),
  dynamicFieldAccess("media_contacts"),
  validate(mediaContactQuerySchema, "query"),
  asyncHandler(mediaContactController.list),
);
router.get(
  "/:id",
  authorizeModule("media_contacts", "read"),
  dynamicFieldAccess("media_contacts"),
  asyncHandler(mediaContactController.getById),
);

// ── Create ──
router.post(
  "/",
  authorizeModule("media_contacts", "create"),
  validate(createMediaContactSchema),
  asyncHandler(mediaContactController.create),
);

// ── Update ──
router.patch(
  "/:id",
  authorizeModule("media_contacts", "update"),
  validate(updateMediaContactSchema),
  asyncHandler(mediaContactController.update),
);

// ── Delete ──
router.delete(
  "/:id",
  authorizeModule("media_contacts", "delete"),
  asyncHandler(mediaContactController.remove),
);

export default router;
