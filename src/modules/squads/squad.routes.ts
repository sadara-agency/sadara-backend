// ─────────────────────────────────────────────────────────────
// src/modules/squads/squad.routes.ts
//
// Read-only routes for squads. Mounted at /api/v1/squads.
//   GET /              — paginated list, filterable by club/age/division
//   GET /:id           — single squad
//   GET /by-club/:clubId — all squads under a club (for ClubSquadList UI)
//
// Writes go through the SAFF wizard, not this router.
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import {
  squadQuerySchema,
  squadIdParamSchema,
  squadByClubParamSchema,
} from "@modules/squads/squad.validation";
import * as squadController from "@modules/squads/squad.controller";

const router = Router();
router.use(authenticate);
router.use(dynamicFieldAccess("squads"));

router.get(
  "/",
  authorizeModule("squads", "read"),
  validate(squadQuerySchema, "query"),
  asyncHandler(squadController.list),
);

router.get(
  "/by-club/:clubId",
  authorizeModule("squads", "read"),
  validate(squadByClubParamSchema, "params"),
  asyncHandler(squadController.listByClub),
);

router.get(
  "/:id",
  authorizeModule("squads", "read"),
  validate(squadIdParamSchema, "params"),
  asyncHandler(squadController.getById),
);

export default router;
