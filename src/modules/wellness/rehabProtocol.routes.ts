import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as ctrl from "./rehabProtocol.controller";
import {
  createRehabProtocolSchema,
  updateRehabProtocolSchema,
  listRehabProtocolsQuerySchema,
  protocolIdParamSchema,
  createRehabPhaseSchema,
  updateRehabPhaseSchema,
  phaseParamSchema,
  createRehabPhaseExerciseSchema,
  updateRehabPhaseExerciseSchema,
  exerciseParamSchema,
} from "./rehabProtocol.validation";

const router = Router();
router.use(authenticate);

// ── Protocols ──

router.get(
  "/",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  cacheRoute("rehab-protocols", CacheTTL.MEDIUM),
  validate(listRehabProtocolsQuerySchema, "query"),
  asyncHandler(ctrl.list),
);

router.get(
  "/player/:playerId",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  asyncHandler(ctrl.listForPlayer),
);

router.get(
  "/:id",
  authorizeModule("wellness", "read"),
  dynamicFieldAccess("wellness"),
  validate(protocolIdParamSchema, "params"),
  asyncHandler(ctrl.getById),
);

router.post(
  "/",
  authorizeModule("wellness", "create"),
  validate(createRehabProtocolSchema),
  asyncHandler(ctrl.create),
);

router.patch(
  "/:id",
  authorizeModule("wellness", "update"),
  validate(updateRehabProtocolSchema),
  asyncHandler(ctrl.update),
);

router.delete(
  "/:id",
  authorizeModule("wellness", "delete"),
  asyncHandler(ctrl.remove),
);

router.post(
  "/:id/grant-clearance",
  authorizeModule("wellness", "update"),
  asyncHandler(ctrl.grantClearance),
);

// ── Phases ──

router.post(
  "/:id/phases",
  authorizeModule("wellness", "update"),
  validate(createRehabPhaseSchema),
  asyncHandler(ctrl.addPhase),
);

router.patch(
  "/:id/phases/:phaseId",
  authorizeModule("wellness", "update"),
  validate(phaseParamSchema, "params"),
  validate(updateRehabPhaseSchema),
  asyncHandler(ctrl.updatePhase),
);

router.delete(
  "/:id/phases/:phaseId",
  authorizeModule("wellness", "update"),
  validate(phaseParamSchema, "params"),
  asyncHandler(ctrl.deletePhase),
);

// ── Phase Exercises ──

router.post(
  "/:id/phases/:phaseId/exercises",
  authorizeModule("wellness", "update"),
  validate(phaseParamSchema, "params"),
  validate(createRehabPhaseExerciseSchema),
  asyncHandler(ctrl.addPhaseExercise),
);

router.patch(
  "/:id/phases/:phaseId/exercises/:exerciseId",
  authorizeModule("wellness", "update"),
  validate(exerciseParamSchema, "params"),
  validate(updateRehabPhaseExerciseSchema),
  asyncHandler(ctrl.updatePhaseExercise),
);

router.delete(
  "/:id/phases/:phaseId/exercises/:exerciseId",
  authorizeModule("wellness", "update"),
  validate(exerciseParamSchema, "params"),
  asyncHandler(ctrl.deletePhaseExercise),
);

export default router;
