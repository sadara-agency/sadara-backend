import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  tournamentQuerySchema,
  fetchRequestSchema,
  standingQuerySchema,
  fixtureQuerySchema,
  teamMapQuerySchema,
  mapTeamSchema,
  importRequestSchema,
} from "./saff.schema";
import * as saffController from "./saff.controller";

const router = Router();

// All SAFF routes require authentication
router.use(authenticate);

// ── Tournaments ──
router.get(
  "/tournaments",
  authorizeModule("saff-data", "read"),
  validate(tournamentQuerySchema, "query"),
  asyncHandler(saffController.listTournaments),
);
router.post(
  "/tournaments/seed",
  authorizeModule("saff-data", "create"),
  asyncHandler(saffController.seedTournaments),
);

// ── Fetch (Scrape from SAFF) ──
router.post(
  "/fetch",
  authorizeModule("saff-data", "create"),
  validate(fetchRequestSchema),
  asyncHandler(saffController.fetchFromSaff),
);

// ── Standings ──
router.get(
  "/standings",
  authorizeModule("saff-data", "read"),
  validate(standingQuerySchema, "query"),
  asyncHandler(saffController.listStandings),
);

// ── Fixtures ──
router.get(
  "/fixtures",
  authorizeModule("saff-data", "read"),
  validate(fixtureQuerySchema, "query"),
  asyncHandler(saffController.listFixtures),
);

// ── Team Mappings ──
router.get(
  "/team-maps",
  authorizeModule("saff-data", "read"),
  validate(teamMapQuerySchema, "query"),
  asyncHandler(saffController.listTeamMaps),
);
router.post(
  "/team-maps",
  authorizeModule("saff-data", "create"),
  validate(mapTeamSchema),
  asyncHandler(saffController.mapTeam),
);

// ── Import to Sadara ──
router.post(
  "/import",
  authorizeModule("saff-data", "create"),
  validate(importRequestSchema),
  asyncHandler(saffController.importToSadara),
);

// ── Fetch Team Logos ──
router.post(
  "/fetch-logos",
  authorizeModule("saff-data", "create"),
  asyncHandler(saffController.fetchTeamLogos),
);

// ── Stats ──
router.get("/stats", authorizeModule("saff-data", "read"), asyncHandler(saffController.getStats));

// ── Sync (Scheduler) ──
router.get("/sync-status", authorizeModule("saff-data", "read"), asyncHandler(saffController.getSyncStatus));
router.post(
  "/sync-now",
  authorizeModule("saff-data", "create"),
  asyncHandler(saffController.triggerSync),
);

export default router;
