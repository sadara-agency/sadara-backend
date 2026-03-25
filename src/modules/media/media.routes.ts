import { Router } from "express";
import mediaRequestRoutes from "./media-requests/mediaRequest.routes";
import mediaContactRoutes from "./media-contacts/mediaContact.routes";
import pressReleaseRoutes from "./press-releases/pressRelease.routes";
import mediaKitRoutes from "./media-kits/mediaKit.routes";
import socialPostRoutes from "./social-media/socialPost.routes";

const router = Router();

router.use("/requests", mediaRequestRoutes);
router.use("/contacts", mediaContactRoutes);
router.use("/press-releases", pressReleaseRoutes);
router.use("/kits", mediaKitRoutes);
router.use("/social", socialPostRoutes);

export default router;
