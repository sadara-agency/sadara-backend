import { Router } from "express";
import { authenticate, authorize } from "@middleware/auth";
import { validate } from "@middleware/validate";
import * as packageController from "./package.controller";
import {
  updatePackageConfigSchema,
  updatePlayerPackageSchema,
} from "./package.validation";

const router = Router();
router.use(authenticate);

// All package management is Admin-only
router.get("/configs", authorize("Admin"), packageController.getConfigs);
router.put(
  "/configs",
  authorize("Admin"),
  validate(updatePackageConfigSchema),
  packageController.updateConfigs,
);
router.get("/players", authorize("Admin"), packageController.getPlayers);
router.patch(
  "/players/:id",
  authorize("Admin"),
  validate(updatePlayerPackageSchema),
  packageController.updatePlayerPackage,
);
router.get("/modules", authorize("Admin"), packageController.getModules);

router.get("/tiers", authorize("Admin"), packageController.getTiers);
router.patch("/tiers/:code", authorize("Admin"), packageController.updateTier);

export default router;
