import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createNoteSchema,
  updateNoteSchema,
  noteQuerySchema,
} from "./note.schema";
import * as noteController from "./note.controller";

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
