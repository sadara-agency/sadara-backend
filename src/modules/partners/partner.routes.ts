import { Router } from "express";
import { authenticate, authorizeModule } from "@middleware/auth";
import { dynamicFieldAccess } from "@middleware/fieldAccess";
import { validate } from "@middleware/validate";
import { cacheRoute } from "@middleware/cache.middleware";
import { CacheTTL } from "@shared/utils/cache";
import * as partnerController from "./partner.controller";
import {
  createPartnerSchema,
  updatePartnerSchema,
  getPartnerSchema,
} from "./partner.validation";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  authorizeModule("partners", "read"),
  dynamicFieldAccess("partners"),
  cacheRoute("partners", CacheTTL.MEDIUM),
  partnerController.list,
);

router.get(
  "/:id",
  authorizeModule("partners", "read"),
  dynamicFieldAccess("partners"),
  cacheRoute("partner", CacheTTL.MEDIUM),
  validate(getPartnerSchema, "params"),
  partnerController.getById,
);

router.post(
  "/",
  authorizeModule("partners", "create"),
  validate(createPartnerSchema),
  partnerController.create,
);

router.patch(
  "/:id",
  authorizeModule("partners", "update"),
  validate(updatePartnerSchema),
  partnerController.update,
);

router.delete(
  "/:id",
  authorizeModule("partners", "delete"),
  partnerController.remove,
);

export default router;
