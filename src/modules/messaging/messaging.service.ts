import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import {
  Conversation,
  ConversationParticipant,
  Message,
} from "./conversation.model";
import User from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { publishMessageEvent } from "@modules/notifications/notification.sse";
import type {
  CreateConversationInput,
  SendMessageInput,
  UpdateConversationInput,
  ConversationQuery,
  MessageQuery,
  SearchMessagesQuery,
} from "./messaging.validation";

const USER_ATTRS = ["id", "fullName", "fullNameAr", "avatarUrl"] as const;

// ── Helpers ──

async function assertParticipant(
  conversationId: string,
  userId: string,
): Promise<ConversationParticipant> {
  const cp = await ConversationParticipant.findOne({
    where: { conversationId, userId },
  });
  if (!cp)
    throw new AppError("You are not a participant in this conversation", 403);
  return cp;
}

async function getParticipantIds(conversationId: string): Promise<string[]> {
  const rows = await ConversationParticipant.findAll({
    where: { conversationId },
    attributes: ["userId"],
  });
  return rows.map((r) => r.userId);
}

// ── Create Conversation ──

export async function createConversation(
  data: CreateConversationInput,
  createdBy: string,
) {
  const allParticipantIds = Array.from(
    new Set([createdBy, ...data.participantIds]),
  );

  // Direct conversation dedup: check if one already exists between the two users
  if (data.type === "direct" && allParticipantIds.length === 2) {
    const [userA, userB] = allParticipantIds;
    const existing = await sequelize.query<{ conversation_id: string }>(
      `SELECT cp1.conversation_id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
       JOIN conversations c ON c.id = cp1.conversation_id
       WHERE cp1.user_id = :userA AND cp2.user_id = :userB AND c.type = 'direct'
       LIMIT 1`,
      { replacements: { userA, userB }, type: QueryTypes.SELECT },
    );
    if (existing.length > 0) {
      return getConversationById(existing[0].conversation_id, createdBy);
    }
  }

  const conversation = await Conversation.create({
    type: data.type,
    title: data.title || null,
    titleAr: data.titleAr || null,
    createdBy,
  });

  await ConversationParticipant.bulkCreate(
    allParticipantIds.map((userId) => ({
      conversationId: conversation.id,
      userId,
    })),
  );

  return getConversationById(conversation.id, createdBy);
}

// ── Get Conversation By ID ──

export async function getConversationById(
  conversationId: string,
  userId: string,
) {
  await assertParticipant(conversationId, userId);

  const conversation = await Conversation.findByPk(conversationId, {
    include: [
      {
        model: ConversationParticipant,
        as: "participants",
        include: [{ model: User, as: "user", attributes: [...USER_ATTRS] }],
      },
    ],
  });
  if (!conversation) throw new AppError("Conversation not found", 404);
  return conversation;
}

// ── List Conversations ──

export async function listConversations(
  userId: string,
  query: ConversationQuery,
) {
  const offset = (query.page - 1) * query.limit;

  // Use raw SQL for the complex query with unread counts + last message
  const rows = await sequelize.query<Record<string, unknown>>(
    `SELECT
       c.id, c.type, c.title, c.title_ar AS "titleAr",
       c.created_by AS "createdBy", c.last_message_at AS "lastMessageAt",
       c.created_at AS "createdAt",
       cp.is_archived AS "isArchived", cp.is_muted AS "isMuted",
       cp.last_read_at AS "lastReadAt",
       (
         SELECT COUNT(*)::int
         FROM messages m
         WHERE m.conversation_id = c.id
           AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
           AND m.sender_id != :userId
       ) AS "unreadCount",
       (
         SELECT json_build_object(
           'id', m.id, 'content', m.content, 'contentAr', m.content_ar,
           'senderId', m.sender_id, 'createdAt', m.created_at
         )
         FROM messages m
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC LIMIT 1
       ) AS "lastMessage"
     FROM conversations c
     JOIN conversation_participants cp
       ON cp.conversation_id = c.id AND cp.user_id = :userId
     WHERE cp.is_archived = :archived
     ORDER BY c.last_message_at DESC
     LIMIT :limit OFFSET :offset`,
    {
      replacements: {
        userId,
        archived: query.archived,
        limit: query.limit,
        offset,
      },
      type: QueryTypes.SELECT,
    },
  );

  // Get total count
  const [countResult] = await sequelize.query<{ total: string }>(
    `SELECT COUNT(*)::int AS total
     FROM conversation_participants cp
     WHERE cp.user_id = :userId AND cp.is_archived = :archived`,
    {
      replacements: { userId, archived: query.archived },
      type: QueryTypes.SELECT,
    },
  );
  const total = Number(countResult?.total ?? 0);

  // Fetch participants for each conversation
  const conversationIds = rows.map((r) => r.id as string);
  const participants =
    conversationIds.length > 0
      ? await ConversationParticipant.findAll({
          where: { conversationId: { [Op.in]: conversationIds } },
          include: [{ model: User, as: "user", attributes: [...USER_ATTRS] }],
        })
      : [];

  const participantMap = new Map<string, typeof participants>();
  for (const p of participants) {
    const key = p.conversationId;
    if (!participantMap.has(key)) participantMap.set(key, []);
    participantMap.get(key)!.push(p);
  }

  const data = rows.map((r) => ({
    ...r,
    participants: (participantMap.get(r.id as string) ?? []).map((p) => ({
      userId: p.userId,
      fullName: p.user?.fullName ?? "",
      fullNameAr: p.user?.fullNameAr ?? null,
      avatarUrl: p.user?.avatarUrl ?? null,
    })),
  }));

  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ── Get Messages ──

export async function getMessages(
  conversationId: string,
  userId: string,
  query: MessageQuery,
) {
  await assertParticipant(conversationId, userId);

  const where: Record<string, unknown> = { conversationId };
  if (query.before) {
    where.createdAt = { [Op.lt]: new Date(query.before) };
  }

  const { rows: data, count: total } = await Message.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: query.limit,
    offset: query.before ? 0 : (query.page - 1) * query.limit,
    include: [{ model: User, as: "sender", attributes: [...USER_ATTRS] }],
  });

  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ── Send Message ──

export async function sendMessage(
  conversationId: string,
  senderId: string,
  data: SendMessageInput,
) {
  await assertParticipant(conversationId, senderId);

  const message = await Message.create({
    conversationId,
    senderId,
    content: data.content,
    contentAr: data.contentAr || null,
  });

  // Update last_message_at denormalization
  await Conversation.update(
    { lastMessageAt: new Date() },
    { where: { id: conversationId } },
  );

  // Fetch with sender info
  const full = await Message.findByPk(message.id, {
    include: [{ model: User, as: "sender", attributes: [...USER_ATTRS] }],
  });

  // Push SSE to all other participants
  const participantIds = await getParticipantIds(conversationId);
  const payload = {
    conversationId,
    message: full?.toJSON(),
  };
  for (const pid of participantIds) {
    if (pid !== senderId) {
      publishMessageEvent(pid, "message:new", payload).catch(() => {});
    }
  }

  return full;
}

// ── Mark Conversation Read ──

export async function markConversationRead(
  conversationId: string,
  userId: string,
) {
  const cp = await assertParticipant(conversationId, userId);
  const now = new Date();
  await cp.update({ lastReadAt: now });

  // Notify other participants about read receipt
  const participantIds = await getParticipantIds(conversationId);
  const payload = { conversationId, userId, readAt: now.toISOString() };
  for (const pid of participantIds) {
    if (pid !== userId) {
      publishMessageEvent(pid, "message:read", payload).catch(() => {});
    }
  }

  return { conversationId, lastReadAt: now };
}

// ── Archive / Unarchive ──

export async function archiveConversation(
  conversationId: string,
  userId: string,
) {
  const cp = await assertParticipant(conversationId, userId);
  await cp.update({ isArchived: true });
  return { conversationId, isArchived: true };
}

export async function unarchiveConversation(
  conversationId: string,
  userId: string,
) {
  const cp = await assertParticipant(conversationId, userId);
  await cp.update({ isArchived: false });
  return { conversationId, isArchived: false };
}

// ── Mute / Unmute ──

export async function muteConversation(conversationId: string, userId: string) {
  const cp = await assertParticipant(conversationId, userId);
  await cp.update({ isMuted: !cp.isMuted });
  return { conversationId, isMuted: !cp.isMuted };
}

// ── Update Conversation (group rename) ──

export async function updateConversation(
  conversationId: string,
  userId: string,
  data: UpdateConversationInput,
) {
  await assertParticipant(conversationId, userId);
  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) throw new AppError("Conversation not found", 404);
  if (conversation.type !== "group") {
    throw new AppError("Cannot rename a direct conversation", 400);
  }
  await conversation.update(data);
  return conversation;
}

// ── Add Participants ──

export async function addParticipants(
  conversationId: string,
  userId: string,
  userIds: string[],
) {
  await assertParticipant(conversationId, userId);
  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) throw new AppError("Conversation not found", 404);
  if (conversation.type !== "group") {
    throw new AppError("Cannot add participants to a direct conversation", 400);
  }

  const existing = await ConversationParticipant.findAll({
    where: { conversationId, userId: { [Op.in]: userIds } },
    attributes: ["userId"],
  });
  const existingIds = new Set(existing.map((e) => e.userId));
  const newIds = userIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await ConversationParticipant.bulkCreate(
      newIds.map((uid) => ({ conversationId, userId: uid })),
    );
  }

  return getConversationById(conversationId, userId);
}

// ── Remove Participant ──

export async function removeParticipant(
  conversationId: string,
  userId: string,
  targetUserId: string,
) {
  await assertParticipant(conversationId, userId);
  const conversation = await Conversation.findByPk(conversationId);
  if (!conversation) throw new AppError("Conversation not found", 404);
  if (conversation.type !== "group") {
    throw new AppError(
      "Cannot remove participants from a direct conversation",
      400,
    );
  }

  await ConversationParticipant.destroy({
    where: { conversationId, userId: targetUserId },
  });

  return { conversationId, removedUserId: targetUserId };
}

// ── Search Messages ──

export async function searchMessages(
  userId: string,
  query: SearchMessagesQuery,
) {
  const offset = (query.page - 1) * query.limit;

  const rows = await sequelize.query<Record<string, unknown>>(
    `SELECT m.id, m.conversation_id AS "conversationId",
            m.sender_id AS "senderId", m.content, m.content_ar AS "contentAr",
            m.created_at AS "createdAt",
            c.type AS "conversationType", c.title AS "conversationTitle",
            c.title_ar AS "conversationTitleAr",
            json_build_object('id', u.id, 'fullName', u.full_name,
              'fullNameAr', u.full_name_ar, 'avatarUrl', u.avatar_url) AS sender
     FROM messages m
     JOIN conversation_participants cp
       ON cp.conversation_id = m.conversation_id AND cp.user_id = :userId
     JOIN conversations c ON c.id = m.conversation_id
     JOIN users u ON u.id = m.sender_id
     WHERE m.search_vector @@ plainto_tsquery('simple', :q)
     ORDER BY ts_rank(m.search_vector, plainto_tsquery('simple', :q)) DESC,
              m.created_at DESC
     LIMIT :limit OFFSET :offset`,
    {
      replacements: { userId, q: query.q, limit: query.limit, offset },
      type: QueryTypes.SELECT,
    },
  );

  const [countResult] = await sequelize.query<{ total: string }>(
    `SELECT COUNT(*)::int AS total
     FROM messages m
     JOIN conversation_participants cp
       ON cp.conversation_id = m.conversation_id AND cp.user_id = :userId
     WHERE m.search_vector @@ plainto_tsquery('simple', :q)`,
    { replacements: { userId, q: query.q }, type: QueryTypes.SELECT },
  );
  const total = Number(countResult?.total ?? 0);

  return {
    data: rows,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ── Unread Total ──

export async function getUnreadTotal(userId: string): Promise<number> {
  const [result] = await sequelize.query<{ total: string }>(
    `SELECT COALESCE(SUM(sub.cnt), 0)::int AS total
     FROM (
       SELECT COUNT(*) AS cnt
       FROM messages m
       JOIN conversation_participants cp
         ON cp.conversation_id = m.conversation_id AND cp.user_id = :userId
       WHERE m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
         AND cp.is_archived = false
         AND m.sender_id != :userId
       GROUP BY m.conversation_id
     ) sub`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );
  return Number(result?.total ?? 0);
}

// ── Typing Indicator (ephemeral via SSE) ──

export async function broadcastTyping(
  conversationId: string,
  userId: string,
  fullName: string,
) {
  const participantIds = await getParticipantIds(conversationId);
  const payload = { conversationId, userId, fullName };
  for (const pid of participantIds) {
    if (pid !== userId) {
      publishMessageEvent(pid, "message:typing", payload).catch(() => {});
    }
  }
}
