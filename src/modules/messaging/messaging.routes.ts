import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createConversationSchema,
  sendMessageSchema,
  updateConversationSchema,
  addParticipantsSchema,
  conversationQuerySchema,
  messageQuerySchema,
  searchMessagesSchema,
} from "./messaging.validation";
import * as ctrl from "./messaging.controller";

const router = Router();
router.use(authenticate);

// ── Conversations ──
router.get(
  "/",
  authorizeModule("messaging", "read"),
  validate(conversationQuerySchema, "query"),
  asyncHandler(ctrl.listConversations),
);
router.post(
  "/",
  authorizeModule("messaging", "create"),
  validate(createConversationSchema),
  asyncHandler(ctrl.createConversation),
);
router.get(
  "/search",
  authorizeModule("messaging", "read"),
  validate(searchMessagesSchema, "query"),
  asyncHandler(ctrl.searchMessages),
);
router.get(
  "/unread-count",
  authorizeModule("messaging", "read"),
  asyncHandler(ctrl.getUnreadTotal),
);

// ── Single Conversation ──
router.patch(
  "/:conversationId",
  authorizeModule("messaging", "update"),
  validate(updateConversationSchema),
  asyncHandler(ctrl.updateConversation),
);
router.patch(
  "/:conversationId/read",
  authorizeModule("messaging", "update"),
  asyncHandler(ctrl.markRead),
);
router.patch(
  "/:conversationId/archive",
  authorizeModule("messaging", "update"),
  asyncHandler(ctrl.archiveConversation),
);
router.patch(
  "/:conversationId/unarchive",
  authorizeModule("messaging", "update"),
  asyncHandler(ctrl.unarchiveConversation),
);
router.patch(
  "/:conversationId/mute",
  authorizeModule("messaging", "update"),
  asyncHandler(ctrl.muteConversation),
);

// ── Participants ──
router.post(
  "/:conversationId/participants",
  authorizeModule("messaging", "update"),
  validate(addParticipantsSchema),
  asyncHandler(ctrl.addParticipants),
);
router.delete(
  "/:conversationId/participants/:userId",
  authorizeModule("messaging", "delete"),
  asyncHandler(ctrl.removeParticipant),
);

// ── Messages ──
router.get(
  "/:conversationId/messages",
  authorizeModule("messaging", "read"),
  validate(messageQuerySchema, "query"),
  asyncHandler(ctrl.getMessages),
);
router.post(
  "/:conversationId/messages",
  authorizeModule("messaging", "create"),
  validate(sendMessageSchema),
  asyncHandler(ctrl.sendMessage),
);

// ── Typing ──
router.post(
  "/:conversationId/typing",
  authorizeModule("messaging", "create"),
  asyncHandler(ctrl.startTyping),
);

export default router;
