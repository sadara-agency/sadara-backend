// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.routes.ts
// ─────────────────────────────────────────────────────────────

import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  syncPlayerSchema,
  syncTeamSchema,
  syncAllSchema,
  seedClubIdsSchema,
} from "./spl.schema";
import * as c from "./spl.controller";

const router = Router();
router.use(authenticate);

// Read
router.get("/registry", authorizeModule("spl-sync", "read"), asyncHandler(c.getRegistry));
router.get("/sync-status", authorizeModule("spl-sync", "read"), asyncHandler(c.getStatus));

// Sync operations
router.post(
  "/sync/player",
  authorizeModule("spl-sync", "create"),
  validate(syncPlayerSchema),
  asyncHandler(c.syncPlayer),
);
router.post(
  "/sync/team",
  authorizeModule("spl-sync", "create"),
  validate(syncTeamSchema),
  asyncHandler(c.syncTeam),
);
router.post(
  "/sync/all",
  authorizeModule("spl-sync", "create"),
  validate(syncAllSchema),
  asyncHandler(c.syncAll),
);

// Seed
router.post(
  "/seed-club-ids",
  authorizeModule("spl-sync", "create"),
  validate(seedClubIdsSchema),
  asyncHandler(c.seedClubIds),
);

export default router;
