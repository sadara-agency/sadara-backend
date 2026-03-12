import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { uploadSingle, verifyFileType } from "@middleware/upload";
import {
  createClubSchema,
  updateClubSchema,
  clubQuerySchema,
  createContactSchema,
  updateContactSchema,
} from "@modules/clubs/club.schema";
import * as clubController from "@modules/clubs/club.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("clubs", "read"),
  validate(clubQuerySchema, "query"),
  asyncHandler(clubController.list),
);
router.post(
  "/",
  authorizeModule("clubs", "create"),
  validate(createClubSchema),
  asyncHandler(clubController.create),
);
router.post(
  "/bulk-delete",
  authorizeModule("clubs", "delete"),
  asyncHandler(clubController.bulkRemove),
);
router.get(
  "/:id",
  authorizeModule("clubs", "read"),
  asyncHandler(clubController.getById),
);
router.patch(
  "/:id",
  authorizeModule("clubs", "update"),
  validate(updateClubSchema),
  asyncHandler(clubController.update),
);
router.delete(
  "/:id",
  authorizeModule("clubs", "delete"),
  asyncHandler(clubController.remove),
);

// ── Logo Upload ──
router.post(
  "/:id/logo",
  authorizeModule("clubs", "create"),
  uploadSingle,
  verifyFileType,
  asyncHandler(clubController.uploadLogo),
);

// ── Contact CRUD ──
router.post(
  "/:id/contacts",
  authorizeModule("clubs", "create"),
  validate(createContactSchema),
  asyncHandler(clubController.createContact),
);
router.patch(
  "/:id/contacts/:contactId",
  authorizeModule("clubs", "update"),
  validate(updateContactSchema),
  asyncHandler(clubController.updateContact),
);
router.delete(
  "/:id/contacts/:contactId",
  authorizeModule("clubs", "delete"),
  asyncHandler(clubController.deleteContact),
);

export default router;
