import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { uploadSingle } from "@middleware/upload";
import { validate } from "@middleware/validate";
import {
  createVoiceMemoSchema,
  voiceMemoQuerySchema,
} from "./voice-memo.validation";
import * as ctrl from "./voice-memo.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("scouting", "read"),
  validate(voiceMemoQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

router.post(
  "/",
  authorizeModule("scouting", "create"),
  uploadSingle,
  asyncHandler(ctrl.create),
);

router.delete(
  "/:id",
  authorizeModule("scouting", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
