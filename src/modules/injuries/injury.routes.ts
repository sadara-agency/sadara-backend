import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  createInjurySchema,
  updateInjurySchema,
  addInjuryUpdateSchema,
  injuryQuerySchema,
} from "@modules/injuries/injury.validation";
import * as ctrl from "@modules/injuries/injury.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("injuries", "read"),
  dynamicFieldAccess("injuries"),
  validate(injuryQuerySchema, "query"),
  asyncHandler(ctrl.list),
);
router.get(
  "/stats",
  authorizeModule("injuries", "read"),
  asyncHandler(ctrl.stats),
);
router.get(
  "/player/:playerId",
  authorizeModule("injuries", "read"),
  dynamicFieldAccess("injuries"),
  asyncHandler(ctrl.getByPlayer),
);
router.get(
  "/:id",
  authorizeModule("injuries", "read"),
  dynamicFieldAccess("injuries"),
  asyncHandler(ctrl.getById),
);
router.post(
  "/",
  authorizeModule("injuries", "create"),
  validate(createInjurySchema),
  asyncHandler(ctrl.create),
);
router.patch(
  "/:id",
  authorizeModule("injuries", "update"),
  validate(updateInjurySchema),
  asyncHandler(ctrl.update),
);
router.post(
  "/:id/updates",
  authorizeModule("injuries", "create"),
  validate(addInjuryUpdateSchema),
  asyncHandler(ctrl.addUpdate),
);
router.delete(
  "/:id",
  authorizeModule("injuries", "delete"),
  asyncHandler(ctrl.remove),
);

export default router;
