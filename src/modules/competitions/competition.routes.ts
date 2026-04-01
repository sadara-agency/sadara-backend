import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createCompetitionSchema,
  updateCompetitionSchema,
  competitionQuerySchema,
  addClubSchema,
  clubsQuerySchema,
} from "@modules/competitions/competition.validation";
import * as ctrl from "@modules/competitions/competition.controller";

const router = Router();
router.use(authenticate);

// ── Competition CRUD ──
router.get(
  "/",
  authorizeModule("competitions", "read"),
  validate(competitionQuerySchema, "query"),
  asyncHandler(ctrl.list),
);
router.post(
  "/",
  authorizeModule("competitions", "create"),
  validate(createCompetitionSchema),
  asyncHandler(ctrl.create),
);
router.get(
  "/club/:clubId",
  authorizeModule("competitions", "read"),
  validate(clubsQuerySchema, "query"),
  asyncHandler(ctrl.getClubCompetitions),
);
router.get(
  "/:id",
  authorizeModule("competitions", "read"),
  asyncHandler(ctrl.getById),
);
router.patch(
  "/:id",
  authorizeModule("competitions", "update"),
  validate(updateCompetitionSchema),
  asyncHandler(ctrl.update),
);
router.delete(
  "/:id",
  authorizeModule("competitions", "delete"),
  asyncHandler(ctrl.remove),
);

// ── Club enrollment ──
router.get(
  "/:id/clubs",
  authorizeModule("competitions", "read"),
  validate(clubsQuerySchema, "query"),
  asyncHandler(ctrl.getClubs),
);
router.post(
  "/:id/clubs",
  authorizeModule("competitions", "create"),
  validate(addClubSchema),
  asyncHandler(ctrl.addClub),
);
router.delete(
  "/:id/clubs/:clubId",
  authorizeModule("competitions", "delete"),
  asyncHandler(ctrl.removeClub),
);

export default router;
