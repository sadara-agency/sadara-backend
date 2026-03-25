import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createNoteSchema,
  updateNoteSchema,
  noteQuerySchema,
} from "@modules/notes/note.schema";
import * as noteController from "@modules/notes/note.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("notes", "read"),
  dynamicFieldAccess("notes"),
  validate(noteQuerySchema, "query"),
  asyncHandler(noteController.list),
);
router.post(
  "/",
  authorizeModule("notes", "create"),
  validate(createNoteSchema),
  asyncHandler(noteController.create),
);
router.patch(
  "/:id",
  authorizeModule("notes", "update"),
  validate(updateNoteSchema),
  asyncHandler(noteController.update),
);
router.delete(
  "/:id",
  authorizeModule("notes", "delete"),
  asyncHandler(noteController.remove),
);

export default router;
