import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import * as ctrl from "@modules/notifications/notification.controller";
import { handleSSEConnection } from "@modules/notifications/notification.sse";

const router = Router();

// SSE stream — before authenticate middleware (handles its own JWT + active-user check)
router.get(
  "/stream",
  asyncHandler(async (req, res, _next) => handleSSEConnection(req, res)),
);

router.use(authenticate);

router.get(
  "/",
  authorizeModule("notifications", "read"),
  asyncHandler(ctrl.list),
);
router.get(
  "/unread-count",
  authorizeModule("notifications", "read"),
  asyncHandler(ctrl.unreadCount),
);
router.patch(
  "/read-all",
  authorizeModule("notifications", "update"),
  asyncHandler(ctrl.markAllAsRead),
);
router.patch(
  "/:id/read",
  authorizeModule("notifications", "update"),
  asyncHandler(ctrl.markAsRead),
);
router.delete(
  "/:id",
  authorizeModule("notifications", "delete"),
  asyncHandler(ctrl.dismiss),
);

export default router;
