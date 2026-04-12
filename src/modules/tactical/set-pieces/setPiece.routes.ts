import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import {
  createSetPieceSchema,
  updateSetPieceSchema,
  setPieceQuerySchema,
} from "./setPiece.validation";
import * as ctrl from "./setPiece.controller";

const router = Router();
router.use(authenticate);

// GET /api/v1/tactical/set-pieces
router.get(
  "/",
  authorizeModule("tactical", "read"),
  validate(setPieceQuerySchema, "query"),
  cacheRoute("set-pieces", CacheTTL.MEDIUM),
  ctrl.list,
);

// GET /api/v1/tactical/set-pieces/match/:matchId/summary
router.get(
  "/match/:matchId/summary",
  authorizeModule("tactical", "read"),
  cacheRoute("set-pieces-summary", CacheTTL.MEDIUM),
  ctrl.matchSummary,
);

// GET /api/v1/tactical/set-pieces/:id
router.get("/:id", authorizeModule("tactical", "read"), ctrl.getById);

// POST /api/v1/tactical/set-pieces
router.post(
  "/",
  authorizeModule("tactical", "create"),
  validate(createSetPieceSchema),
  ctrl.create,
);

// PATCH /api/v1/tactical/set-pieces/:id
router.patch(
  "/:id",
  authorizeModule("tactical", "update"),
  validate(updateSetPieceSchema),
  ctrl.update,
);

// DELETE /api/v1/tactical/set-pieces/:id
router.delete("/:id", authorizeModule("tactical", "delete"), ctrl.remove);

export default router;
