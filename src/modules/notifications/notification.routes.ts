import { Router } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import { authenticate, authorizeModule } from "../../middleware/auth";
import * as ctrl from "./notification.controller";
import { handleSSEConnection } from "./notification.sse";

const router = Router();

// SSE stream — before authenticate middleware (handles its own JWT verification)
router.get("/stream", (req, res) => handleSSEConnection(req, res));

router.use(authenticate);

router.get("/", authorizeModule("notifications", "read"), asyncHandler(ctrl.list));
router.get("/unread-count", authorizeModule("notifications", "read"), asyncHandler(ctrl.unreadCount));
router.patch("/read-all", authorizeModule("notifications", "update"), asyncHandler(ctrl.markAllAsRead));
router.patch("/:id/read", authorizeModule("notifications", "update"), asyncHandler(ctrl.markAsRead));
router.delete("/:id", authorizeModule("notifications", "delete"), asyncHandler(ctrl.dismiss));

export default router;
