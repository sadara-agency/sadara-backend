import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import { validate } from "@middleware/validate";
import {
  createEvolutionCycleSchema,
  updateEvolutionCycleSchema,
  evolutionCycleQuerySchema,
  advancePhaseSchema,
} from "./evolution-cycle.validation";
import * as cycleController from "./evolution-cycle.controller";

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /evolution-cycles:
 *   get:
 *     summary: List all evolution cycles
 *     tags: [Evolution Cycles]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  authorizeModule("journey", "read"),
  dynamicFieldAccess("journey"),
  cacheRoute("evolution-cycles", CacheTTL.MEDIUM),
  validate(evolutionCycleQuerySchema, "query"),
  asyncHandler(cycleController.list),
);

/**
 * @swagger
 * /evolution-cycles/player/{playerId}:
 *   get:
 *     summary: Get all evolution cycles for a player
 *     tags: [Evolution Cycles]
 */
router.get(
  "/player/:playerId",
  authorizeModule("journey", "read"),
  dynamicFieldAccess("journey"),
  cacheRoute("evolution-cycles", CacheTTL.MEDIUM),
  asyncHandler(cycleController.getPlayerCycles),
);

/**
 * @swagger
 * /evolution-cycles/{id}:
 *   get:
 *     summary: Get evolution cycle details with stages
 *     tags: [Evolution Cycles]
 */
router.get(
  "/:id",
  authorizeModule("journey", "read"),
  dynamicFieldAccess("journey"),
  cacheRoute("evolution-cycles", CacheTTL.MEDIUM),
  asyncHandler(cycleController.getById),
);

/**
 * @swagger
 * /evolution-cycles:
 *   post:
 *     summary: Create a new evolution cycle
 *     tags: [Evolution Cycles]
 */
router.post(
  "/",
  authorizeModule("journey", "create"),
  validate(createEvolutionCycleSchema),
  asyncHandler(cycleController.create),
);

/**
 * @swagger
 * /evolution-cycles/{id}:
 *   patch:
 *     summary: Update an evolution cycle
 *     tags: [Evolution Cycles]
 */
router.patch(
  "/:id",
  authorizeModule("journey", "update"),
  validate(updateEvolutionCycleSchema),
  asyncHandler(cycleController.update),
);

/**
 * @swagger
 * /evolution-cycles/{id}/advance:
 *   post:
 *     summary: Advance cycle to next phase
 *     tags: [Evolution Cycles]
 */
router.post(
  "/:id/advance",
  authorizeModule("journey", "update"),
  validate(advancePhaseSchema),
  asyncHandler(cycleController.advancePhase),
);

/**
 * @swagger
 * /evolution-cycles/{id}:
 *   delete:
 *     summary: Delete an evolution cycle
 *     tags: [Evolution Cycles]
 */
router.delete(
  "/:id",
  authorizeModule("journey", "delete"),
  asyncHandler(cycleController.remove),
);

export default router;
