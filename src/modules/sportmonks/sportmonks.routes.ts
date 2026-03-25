import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import * as ctrl from "@modules/sportmonks/sportmonks.controller";

const router = Router();
router.use(authenticate);

router.get(
  "/fixtures",
  authorizeModule("sportmonks", "read"),
  asyncHandler(ctrl.getFixtures),
);
router.post(
  "/import",
  authorizeModule("sportmonks", "create"),
  asyncHandler(ctrl.importFixtures),
);
router.get(
  "/leagues",
  authorizeModule("sportmonks", "read"),
  asyncHandler(ctrl.getLeagues),
);
router.get(
  "/team-maps",
  authorizeModule("sportmonks", "read"),
  asyncHandler(ctrl.getTeamMappings),
);
router.patch(
  "/team-maps/:sportmonksTeamId/map",
  authorizeModule("sportmonks", "update"),
  asyncHandler(ctrl.mapTeam),
);
router.get(
  "/teams/search",
  authorizeModule("sportmonks", "read"),
  asyncHandler(ctrl.searchTeamsHandler),
);
router.post(
  "/test-connection",
  authorizeModule("sportmonks", "read"),
  asyncHandler(ctrl.testConnectionHandler),
);

export default router;
