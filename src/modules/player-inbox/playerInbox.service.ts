import { Op } from "sequelize";
import {
  PlayerInboxItem,
  PlayerInboxEvent,
  type InboxCategory,
  type InboxEventType,
} from "./playerInbox.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { Document } from "@modules/documents/document.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { logger } from "@config/logger";
import { logAudit } from "@shared/utils/audit";
import {
  notifyUser,
  notifyByRole,
} from "@modules/notifications/notification.service";
import type { NotificationType } from "@modules/notifications/notification.model";
import { getLinkedPlayer } from "@modules/portal/portal.service";
import {
  buildRowScope,
  mergeScope,
  isBypassRole,
} from "@shared/utils/rowScope";
import type { AuthUser, AuditContext } from "@shared/types";
import type {
  CreateInboxItemInput,
  UpdateInboxItemInput,
  CancelInboxItemInput,
  InboxQuery,
  MyInboxQuery,
} from "./playerInbox.validation";

const STAFF_FIELDS_HIDDEN_FROM_PLAYER = ["staffNotes"] as const;

// Attributes returned to the player — everything except internal staff fields.
const PLAYER_VISIBLE_ATTRIBUTES = Object.keys(
  PlayerInboxItem.getAttributes(),
).filter((a) => !STAFF_FIELDS_HIDDEN_FROM_PLAYER.includes(a as never));

const PLAYER_INCLUDE = {
  model: Player,
  as: "player",
  attributes: [
    "id",
    "firstName",
    "lastName",
    "firstNameAr",
    "lastNameAr",
    "photoUrl",
  ],
} as const;

const ISSUER_INCLUDE = {
  model: User,
  as: "issuedBy",
  attributes: ["id", "fullName", "fullNameAr", "role"],
} as const;

const ATTACHMENT_INCLUDE = {
  model: Document,
  as: "attachmentDocument",
  attributes: ["id", "name", "fileUrl"],
} as const;

const EVENTS_INCLUDE = {
  model: PlayerInboxEvent,
  as: "events",
} as const;

// PlayerInboxItem ↔ Player / User / Document associations live here (the model
// file only wires the events relation; these belong-tos reference modules that
// would create a circular import if declared in the model module).
let associationsWired = false;
function ensureAssociations(): void {
  if (associationsWired) return;
  PlayerInboxItem.belongsTo(Player, { foreignKey: "playerId", as: "player" });
  PlayerInboxItem.belongsTo(User, {
    foreignKey: "issuedByUserId",
    as: "issuedBy",
  });
  PlayerInboxItem.belongsTo(Document, {
    foreignKey: "attachmentDocumentId",
    as: "attachmentDocument",
  });
  associationsWired = true;
}

const CATEGORY_TO_NOTIF_TYPE: Record<InboxCategory, NotificationType> = {
  management_order: "management_order",
  disciplinary: "management_order",
  fine: "management_order",
  directive: "management_order",
  mental_task: "mental_task",
};

// ── Helpers ──

async function recordEvent(
  itemId: string,
  eventType: InboxEventType,
  actor: { id: string; role: string },
  ctx?: AuditContext,
): Promise<void> {
  await PlayerInboxEvent.create({
    inboxItemId: itemId,
    actorUserId: actor.id,
    actorRole: actor.role,
    eventType,
    metadata: ctx?.ip ? { ip: ctx.ip } : null,
  });
}

/** Resolve the user account linked to a player (for player-targeted notifications). */
async function findPlayerUserId(playerId: string): Promise<string | null> {
  const user = await User.findOne({
    where: { playerId, role: "Player" },
    attributes: ["id"],
  });
  return user?.id ?? null;
}

function playerName(player?: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (!player) return "this player";
  return (
    [player.firstName, player.lastName].filter(Boolean).join(" ").trim() ||
    "this player"
  );
}

// ── Staff: list ──

export async function listInboxItems(query: InboxQuery, user?: AuthUser) {
  ensureAssociations();
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "created_at",
  );

  const where: Record<string | symbol, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.category) where.category = query.category;
  if (query.status) where.status = query.status;

  const scope = await buildRowScope("player-inbox", user);
  if (scope) mergeScope(where, scope);

  const { count, rows } = await PlayerInboxItem.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order.toUpperCase()]],
    include: [PLAYER_INCLUDE as never, ISSUER_INCLUDE as never],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Staff: getById (full receipt trail) ──

export async function getInboxItemById(id: string, user?: AuthUser) {
  ensureAssociations();
  const item = await PlayerInboxItem.findByPk(id, {
    include: [
      PLAYER_INCLUDE as never,
      ISSUER_INCLUDE as never,
      ATTACHMENT_INCLUDE as never,
      {
        ...EVENTS_INCLUDE,
        separate: true,
        order: [["createdAt", "ASC"]],
      } as never,
    ],
  });
  if (!item) throw new AppError("Inbox item not found", 404);

  if (user && !isBypassRole(user.role)) {
    const scope = await buildRowScope("player-inbox", user);
    if (scope) {
      // Coach/staff scope is playerId-based; verify membership.
      const scopedPlayerIds = (scope as { playerId?: { [Op.in]?: string[] } })
        .playerId?.[Op.in];
      if (
        Array.isArray(scopedPlayerIds) &&
        !scopedPlayerIds.includes(item.playerId)
      ) {
        throw new AppError("Inbox item not found", 404);
      }
    }
  }

  return item;
}

// ── Staff: create ──

export async function createInboxItem(
  data: CreateInboxItemInput,
  issuedByUserId: string,
  ctx: AuditContext,
) {
  ensureAssociations();
  const player = await Player.findByPk(data.playerId);
  if (!player) throw new AppError("Player not found", 404);

  const item = await PlayerInboxItem.create({
    playerId: data.playerId,
    issuedByUserId,
    category: data.category,
    title: data.title,
    titleAr: data.titleAr ?? null,
    body: data.body,
    bodyAr: data.bodyAr ?? null,
    priority: data.priority ?? "normal",
    requiresAcknowledgement: data.requiresAcknowledgement ?? true,
    fineAmount: data.fineAmount !== undefined ? String(data.fineAmount) : null,
    fineCurrency: data.fineCurrency ?? null,
    dueAt: data.dueAt ? new Date(data.dueAt) : null,
    attachmentDocumentId: data.attachmentDocumentId ?? null,
    staffNotes: data.staffNotes ?? null,
  });

  await recordEvent(
    item.id,
    "sent",
    { id: ctx.userId, role: ctx.userRole },
    ctx,
  );

  // Fire-and-forget fan-out — never block the API response (mirrors
  // fanOutNewAssignment in playerCoachAssignment.service.ts).
  void fanOutNewItem(item, player, ctx);

  return item;
}

async function fanOutNewItem(
  item: PlayerInboxItem,
  player: Player,
  ctx: AuditContext,
): Promise<void> {
  try {
    const name = playerName(player);
    const nameAr =
      [
        (player as unknown as { firstNameAr?: string | null }).firstNameAr,
        (player as unknown as { lastNameAr?: string | null }).lastNameAr,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || name;

    const playerUserId = await findPlayerUserId(item.playerId);
    if (playerUserId) {
      await notifyUser(playerUserId, {
        type: CATEGORY_TO_NOTIF_TYPE[item.category],
        priority: item.priority,
        title: `New ${item.category.replace("_", " ")}: ${item.title}`,
        titleAr: `${item.titleAr ?? item.title}`,
        body: item.body.slice(0, 280),
        bodyAr: (item.bodyAr ?? item.body).slice(0, 280),
        link: `/player/inbox/${item.id}`,
        sourceType: "player_inbox",
        sourceId: item.id,
      });
    } else {
      logger.debug(
        `Player ${item.playerId} has no linked user account — inbox notification skipped`,
      );
    }

    await logAudit(
      "CREATE",
      "player-inbox",
      item.id,
      ctx,
      `Issued ${item.category} to ${name}: ${item.title}`,
    );
    void nameAr;
  } catch (err) {
    logger.warn("Player-inbox fan-out failed", {
      itemId: item.id,
      error: (err as Error).message,
    });
  }
}

// ── Staff: update (metadata edits) ──

export async function updateInboxItem(
  id: string,
  data: UpdateInboxItemInput,
  user: AuthUser,
  ctx: AuditContext,
) {
  const item = await getInboxItemById(id, user);
  if (item.status === "Resolved" || item.status === "Cancelled") {
    throw new AppError(
      `Cannot edit an item that is already ${item.status}`,
      422,
    );
  }

  const patch: Record<string, unknown> = {};
  if (data.title !== undefined) patch.title = data.title;
  if (data.titleAr !== undefined) patch.titleAr = data.titleAr;
  if (data.body !== undefined) patch.body = data.body;
  if (data.bodyAr !== undefined) patch.bodyAr = data.bodyAr;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.requiresAcknowledgement !== undefined)
    patch.requiresAcknowledgement = data.requiresAcknowledgement;
  if (data.fineAmount !== undefined)
    patch.fineAmount =
      data.fineAmount === null ? null : String(data.fineAmount);
  if (data.fineCurrency !== undefined) patch.fineCurrency = data.fineCurrency;
  if (data.dueAt !== undefined)
    patch.dueAt = data.dueAt === null ? null : new Date(data.dueAt);
  if (data.attachmentDocumentId !== undefined)
    patch.attachmentDocumentId = data.attachmentDocumentId;
  if (data.staffNotes !== undefined) patch.staffNotes = data.staffNotes;

  await item.update(patch);
  void logAudit(
    "UPDATE",
    "player-inbox",
    item.id,
    ctx,
    `Updated ${item.title}`,
  );
  return item;
}

// ── Staff: resolve ──

export async function resolveInboxItem(
  id: string,
  user: AuthUser,
  ctx: AuditContext,
) {
  const item = await getInboxItemById(id, user);
  if (item.status === "Cancelled") {
    throw new AppError("Cannot resolve a cancelled item", 422);
  }
  if (item.status === "Resolved") return item;

  await item.update({
    status: "Resolved",
    resolvedAt: new Date(),
    resolvedByUserId: user.id,
  });
  await recordEvent(
    item.id,
    "resolved",
    { id: ctx.userId, role: ctx.userRole },
    ctx,
  );
  void logAudit(
    "RESOLVE",
    "player-inbox",
    item.id,
    ctx,
    `Resolved ${item.title}`,
  );

  void (async () => {
    const playerUserId = await findPlayerUserId(item.playerId);
    if (playerUserId) {
      await notifyUser(playerUserId, {
        type: CATEGORY_TO_NOTIF_TYPE[item.category],
        priority: "low",
        title: `Closed: ${item.title}`,
        titleAr: `تم الإغلاق: ${item.titleAr ?? item.title}`,
        link: `/player/inbox/${item.id}`,
        sourceType: "player_inbox",
        sourceId: item.id,
      });
    }
  })().catch((err) =>
    logger.warn("resolve notification failed", {
      itemId: item.id,
      error: (err as Error).message,
    }),
  );

  return item;
}

// ── Staff: cancel ──

export async function cancelInboxItem(
  id: string,
  input: CancelInboxItemInput,
  user: AuthUser,
  ctx: AuditContext,
) {
  const item = await getInboxItemById(id, user);
  if (item.status === "Cancelled") return item;
  if (item.status === "Resolved") {
    throw new AppError("Cannot cancel a resolved item", 422);
  }

  await item.update({ status: "Cancelled" });
  await recordEvent(
    item.id,
    "cancelled",
    { id: ctx.userId, role: ctx.userRole },
    ctx,
  );
  void logAudit(
    "CANCEL",
    "player-inbox",
    item.id,
    ctx,
    `Cancelled ${item.title}${input.reason ? ` — ${input.reason}` : ""}`,
  );

  void (async () => {
    const playerUserId = await findPlayerUserId(item.playerId);
    if (playerUserId) {
      await notifyUser(playerUserId, {
        type: CATEGORY_TO_NOTIF_TYPE[item.category],
        priority: "low",
        title: `Cancelled: ${item.title}`,
        titleAr: `أُلغي: ${item.titleAr ?? item.title}`,
        link: `/player/inbox/${item.id}`,
        sourceType: "player_inbox",
        sourceId: item.id,
      });
    }
  })().catch((err) =>
    logger.warn("cancel notification failed", {
      itemId: item.id,
      error: (err as Error).message,
    }),
  );

  return item;
}

// ── Staff: hard delete (rare) ──

export async function deleteInboxItem(id: string, user: AuthUser) {
  const item = await getInboxItemById(id, user);
  await item.destroy();
  return { id };
}

// ── Player: resolve playerId from the authenticated user ──

async function resolvePlayerId(userId: string): Promise<string> {
  const player = await getLinkedPlayer(userId);
  return String(player.id);
}

// ── Player: list ──

export async function listMyInboxItems(userId: string, query: MyInboxQuery) {
  ensureAssociations();
  const playerId = await resolvePlayerId(userId);
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "created_at",
  );

  const where: Record<string | symbol, unknown> = { playerId };
  if (query.category && query.category.length > 0) {
    where.category =
      query.category.length === 1
        ? query.category[0]
        : { [Op.in]: query.category };
  }
  if (query.status && query.status.length > 0) {
    where.status =
      query.status.length === 1 ? query.status[0] : { [Op.in]: query.status };
  }
  if (query.unreadOnly === "true") {
    where.acknowledgedAt = null;
    where.status = { [Op.ne]: "Cancelled" };
  }

  const { count, rows } = await PlayerInboxItem.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order.toUpperCase()]],
    attributes: PLAYER_VISIBLE_ATTRIBUTES,
    include: [ISSUER_INCLUDE as never, ATTACHMENT_INCLUDE as never],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Player: getById (with first-view side effect) ──

export async function getMyInboxItemById(userId: string, id: string) {
  ensureAssociations();
  const playerId = await resolvePlayerId(userId);
  const item = await PlayerInboxItem.findByPk(id, {
    attributes: PLAYER_VISIBLE_ATTRIBUTES,
    include: [ISSUER_INCLUDE as never, ATTACHMENT_INCLUDE as never],
  });
  if (!item || item.playerId !== playerId) {
    throw new AppError("Inbox item not found", 404);
  }

  if (!item.firstViewedAt && item.status !== "Cancelled") {
    const patch: Record<string, unknown> = { firstViewedAt: new Date() };
    if (item.status === "Sent") patch.status = "Viewed";
    await item.update(patch);

    void (async () => {
      await recordEvent(item.id, "viewed", { id: userId, role: "Player" });
      const issuerUser = await User.findByPk(item.issuedByUserId, {
        attributes: ["id"],
      });
      if (issuerUser) {
        await notifyUser(issuerUser.id, {
          type: CATEGORY_TO_NOTIF_TYPE[item.category],
          priority: "low",
          title: `Player viewed: ${item.title}`,
          titleAr: `اطّلع اللاعب على: ${item.titleAr ?? item.title}`,
          link: `/dashboard/players/${item.playerId}?tab=inbox`,
          sourceType: "player_inbox",
          sourceId: item.id,
        });
      }
    })().catch((err) =>
      logger.warn("inbox view side-effect failed", {
        itemId: item.id,
        error: (err as Error).message,
      }),
    );
  }

  return item;
}

// ── Player: acknowledge ──

export async function acknowledgeInboxItem(
  userId: string,
  id: string,
  ctx: AuditContext,
) {
  ensureAssociations();
  const playerId = await resolvePlayerId(userId);
  const item = await PlayerInboxItem.findByPk(id);
  if (!item || item.playerId !== playerId) {
    throw new AppError("Inbox item not found", 404);
  }
  if (item.status === "Acknowledged") {
    throw new AppError("This item has already been acknowledged", 422);
  }
  if (item.status === "Resolved") {
    throw new AppError("This item is already closed", 422);
  }
  if (item.status === "Cancelled") {
    throw new AppError("This item has been cancelled", 422);
  }

  const now = new Date();
  await item.update({
    status: "Acknowledged",
    acknowledgedAt: now,
    firstViewedAt: item.firstViewedAt ?? now,
  });
  await recordEvent(
    item.id,
    "acknowledged",
    { id: userId, role: "Player" },
    ctx,
  );
  void logAudit(
    "ACKNOWLEDGE",
    "player-inbox",
    item.id,
    ctx,
    `Player acknowledged ${item.title}`,
  );

  void (async () => {
    const player = await Player.findByPk(item.playerId, {
      attributes: ["firstName", "lastName"],
    });
    const name = playerName(player ?? undefined);
    const issuerUser = await User.findByPk(item.issuedByUserId, {
      attributes: ["id"],
    });
    if (issuerUser) {
      await notifyUser(issuerUser.id, {
        type: CATEGORY_TO_NOTIF_TYPE[item.category],
        priority: "normal",
        title: `${name} acknowledged: ${item.title}`,
        titleAr: `${name} أقرّ باستلام: ${item.titleAr ?? item.title}`,
        link: `/dashboard/players/${item.playerId}?tab=inbox`,
        sourceType: "player_inbox",
        sourceId: item.id,
      });
    }
    await notifyByRole(["Admin", "Manager", "Executive", "SportingDirector"], {
      type: CATEGORY_TO_NOTIF_TYPE[item.category],
      priority: "low",
      title: `${name} acknowledged a ${item.category.replace("_", " ")}`,
      titleAr: `${name} أقرّ باستلام إشعار`,
      link: `/dashboard/players/${item.playerId}?tab=inbox`,
      sourceType: "player_inbox",
      sourceId: item.id,
    });
  })().catch((err) =>
    logger.warn("acknowledge notification failed", {
      itemId: item.id,
      error: (err as Error).message,
    }),
  );

  return item;
}

// ── Player: summary (Action Center badge) ──

export async function getMyInboxSummary(userId: string) {
  const playerId = await resolvePlayerId(userId);
  const [total, unread] = await Promise.all([
    PlayerInboxItem.count({ where: { playerId } }),
    PlayerInboxItem.count({
      where: {
        playerId,
        acknowledgedAt: null,
        status: { [Op.ne]: "Cancelled" },
      },
    }),
  ]);

  const byCategoryRows = (await PlayerInboxItem.findAll({
    where: { playerId, acknowledgedAt: null, status: { [Op.ne]: "Cancelled" } },
    attributes: ["category"],
    raw: true,
  })) as unknown as Array<{ category: InboxCategory }>;
  const byCategory = byCategoryRows.reduce<Record<string, number>>((m, r) => {
    m[r.category] = (m[r.category] ?? 0) + 1;
    return m;
  }, {});

  return { total, unread, byCategory };
}
