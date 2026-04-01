import { Response } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import * as messagingService from "./messaging.service";

export async function listConversations(req: AuthRequest, res: Response) {
  const result = await messagingService.listConversations(
    req.user!.id,
    req.query as never,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function createConversation(req: AuthRequest, res: Response) {
  const conversation = await messagingService.createConversation(
    req.body,
    req.user!.id,
  );
  sendCreated(res, conversation, "Conversation created");
}

export async function getMessages(req: AuthRequest, res: Response) {
  const result = await messagingService.getMessages(
    req.params.conversationId,
    req.user!.id,
    req.query as never,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function sendMessage(req: AuthRequest, res: Response) {
  const message = await messagingService.sendMessage(
    req.params.conversationId,
    req.user!.id,
    req.body,
  );
  sendCreated(res, message, "Message sent");
}

export async function markRead(req: AuthRequest, res: Response) {
  const result = await messagingService.markConversationRead(
    req.params.conversationId,
    req.user!.id,
  );
  sendSuccess(res, result, "Conversation marked as read");
}

export async function archiveConversation(req: AuthRequest, res: Response) {
  const result = await messagingService.archiveConversation(
    req.params.conversationId,
    req.user!.id,
  );
  sendSuccess(res, result, "Conversation archived");
}

export async function unarchiveConversation(req: AuthRequest, res: Response) {
  const result = await messagingService.unarchiveConversation(
    req.params.conversationId,
    req.user!.id,
  );
  sendSuccess(res, result, "Conversation unarchived");
}

export async function muteConversation(req: AuthRequest, res: Response) {
  const result = await messagingService.muteConversation(
    req.params.conversationId,
    req.user!.id,
  );
  sendSuccess(res, result);
}

export async function updateConversation(req: AuthRequest, res: Response) {
  const result = await messagingService.updateConversation(
    req.params.conversationId,
    req.user!.id,
    req.body,
  );
  sendSuccess(res, result, "Conversation updated");
}

export async function addParticipants(req: AuthRequest, res: Response) {
  const result = await messagingService.addParticipants(
    req.params.conversationId,
    req.user!.id,
    req.body.userIds,
  );
  sendSuccess(res, result, "Participants added");
}

export async function removeParticipant(req: AuthRequest, res: Response) {
  const result = await messagingService.removeParticipant(
    req.params.conversationId,
    req.user!.id,
    req.params.userId,
  );
  sendSuccess(res, result, "Participant removed");
}

export async function searchMessages(req: AuthRequest, res: Response) {
  const result = await messagingService.searchMessages(
    req.user!.id,
    req.query as never,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getUnreadTotal(req: AuthRequest, res: Response) {
  const total = await messagingService.getUnreadTotal(req.user!.id);
  sendSuccess(res, { total });
}

export async function startTyping(req: AuthRequest, res: Response) {
  await messagingService.broadcastTyping(
    req.params.conversationId,
    req.user!.id,
    req.user!.fullName ?? "",
  );
  sendSuccess(res, null);
}
