import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import * as ctrl from "@modules/sportmonks/sportmonks.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/fixtures",
  authorizeModule("matches", "read"),
  asyncHandler(ctrl.getFixtures),
);
router.post(
  "/import",
  authorizeModule("matches", "create"),
  asyncHandler(ctrl.importFixtures),
);
router.get(
  "/leagues",
  authorizeModule("matches", "read"),
  asyncHandler(ctrl.getLeagues),
);
router.get(
  "/team-maps",
  authorizeModule("matches", "read"),
  asyncHandler(ctrl.getTeamMappings),
);
router.patch(
  "/team-maps/:sportmonksTeamId/map",
  authorizeModule("matches", "update"),
  asyncHandler(ctrl.mapTeam),
);
router.get(
  "/teams/search",
  authorizeModule("matches", "read"),
  asyncHandler(ctrl.searchTeamsHandler),
);
router.post(
  "/test-connection",
  authorizeModule("matches", "read"),
  asyncHandler(ctrl.testConnectionHandler),
);

export default router;
