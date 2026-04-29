import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createPersonalNoteSchema,
  updatePersonalNoteSchema,
  personalNoteQuerySchema,
  personalNoteParamsSchema,
} from "./personal-note.validation";
import * as personalNoteController from "./personal-note.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /personal-notes:
 *   get:
 *     summary: List personal notes for the authenticated user
 *     tags: [PersonalNotes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of personal notes
 */
router.get(
  "/",
  authorizeModule("personal-notes", "read"),
  validate(personalNoteQuerySchema, "query"),
  asyncHandler(personalNoteController.list),
);

router.get(
  "/:id",
  authorizeModule("personal-notes", "read"),
  validate(personalNoteParamsSchema, "params"),
  asyncHandler(personalNoteController.getById),
);

router.post(
  "/",
  authorizeModule("personal-notes", "create"),
  validate(createPersonalNoteSchema),
  asyncHandler(personalNoteController.create),
);

router.patch(
  "/:id",
  authorizeModule("personal-notes", "update"),
  validate(personalNoteParamsSchema, "params"),
  validate(updatePersonalNoteSchema),
  asyncHandler(personalNoteController.update),
);

router.delete(
  "/:id",
  authorizeModule("personal-notes", "delete"),
  validate(personalNoteParamsSchema, "params"),
  asyncHandler(personalNoteController.remove),
);

export default router;
