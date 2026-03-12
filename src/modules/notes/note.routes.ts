import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate } from "@middleware/auth";
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
  validate(noteQuerySchema, "query"),
  asyncHandler(noteController.list),
);
router.post(
  "/",
  validate(createNoteSchema),
  asyncHandler(noteController.create),
);
router.patch(
  "/:id",
  validate(updateNoteSchema),
  asyncHandler(noteController.update),
);
router.delete("/:id", asyncHandler(noteController.remove));

export default router;
