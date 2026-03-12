import { Op } from "sequelize";
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from "@modules/notifications/notification.model";
import { User } from "@modules/users/user.model";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { logger } from "@config/logger";
import {
  publishNotification,
  type SSENotificationPayload,
} from "@modules/notifications/notification.sse";

// ── Create a single notification ──

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  titleAr?: string;
  body?: string;
  bodyAr?: string;
  link?: string;
  sourceType?: string;
  sourceId?: string;
  priority?: NotificationPriority;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    const notif = await Notification.create(input as any);

    // Push to SSE (fire-and-forget)
    if (notif) {
      const payload: SSENotificationPayload = {
        id: notif.id,
        type: notif.type,
        title: notif.title,
        titleAr: notif.titleAr,
        body: notif.body,
        bodyAr: notif.bodyAr,
        link: notif.link,
        priority: notif.priority,
        isRead: false,
        createdAt:
          notif.createdAt instanceof Date
            ? notif.createdAt.toISOString()
            : String(notif.createdAt),
      };
      publishNotification(input.userId, payload).catch((err) =>
        logger.warn("SSE publish failed", {
          userId: input.userId,
          error: (err as Error).message,
        }),
      );
    }

    return notif;
  } catch (err: any) {
    // Unique constraint violation = duplicate → skip silently
    if (err.name === "SequelizeUniqueConstraintError") {
      logger.debug(
        `Duplicate notification skipped: ${input.sourceType}/${input.sourceId} for user ${input.userId}`,
      );
      return null;
    }
    throw err;
  }
}

// ── Notification type → preference key mapping ──

const TYPE_TO_PREF: Record<string, string> = {
  contract: "contracts",
  injury: "injuries",
  payment: "payments",
  match: "matches",
  referral: "referrals",
  document: "documents",
  task: "tasks",
  system: "system",
};

// ── Notify all users with specific roles ──

export async function notifyByRole(
  roles: string[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  const users = await User.findAll({
    where: { role: { [Op.in]: roles }, isActive: true },
    attributes: ["id", "notificationPreferences"],
  });

  if (users.length === 0) return 0;

  // Filter out users who disabled this notification type
  const prefKey = TYPE_TO_PREF[input.type];
  const eligible = prefKey
    ? users.filter((u) => {
        const prefs = (u as any).notificationPreferences;
        if (!prefs || typeof prefs !== "object") return true;
        return prefs[prefKey] !== false;
      })
    : users;

  if (eligible.length === 0) return 0;

  const records = eligible.map((u) => ({ ...input, userId: u.id }));

  const results = await Notification.bulkCreate(records as any[], {
    ignoreDuplicates: true,
  });

  // Push each to SSE (fire-and-forget)
  for (const notif of results) {
    const payload: SSENotificationPayload = {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      titleAr: notif.titleAr,
      body: notif.body,
      bodyAr: notif.bodyAr,
      link: notif.link,
      priority: notif.priority,
      isRead: false,
      createdAt:
        notif.createdAt instanceof Date
          ? notif.createdAt.toISOString()
          : String(notif.createdAt),
    };
    publishNotification(notif.userId, payload).catch((err) =>
      logger.warn("SSE publish failed", {
        userId: notif.userId,
        error: (err as Error).message,
      }),
    );
  }

  logger.info(
    `Notified ${results.length}/${users.length} users (roles: ${roles.join(",")}) — ${input.type}: ${input.title}`,
  );
  return results.length;
}

// ── Notify a specific user ──

export async function notifyUser(
  userId: string,
  input: Omit<CreateNotificationInput, "userId">,
) {
  return createNotification({ ...input, userId });
}

// ── List notifications for a user ──

export async function listNotifications(userId: string, queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "createdAt");
  const where: any = { userId, isDismissed: false };

  if (queryParams.unreadOnly === "true") where.isRead = false;
  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.priority) where.priority = queryParams.priority;

  const { count, rows } = await Notification.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Unread count ──

export async function getUnreadCount(userId: string) {
  return Notification.count({
    where: { userId, isRead: false, isDismissed: false },
  });
}

// ── Mark as read ──

export async function markAsRead(userId: string, notificationId: string) {
  const [updated] = await Notification.update(
    { isRead: true },
    { where: { id: notificationId, userId } },
  );
  return updated > 0;
}

// ── Mark all as read ──

export async function markAllAsRead(userId: string) {
  const [updated] = await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } },
  );
  return updated;
}

// ── Dismiss ──

export async function dismissNotification(
  userId: string,
  notificationId: string,
) {
  const [updated] = await Notification.update(
    { isDismissed: true },
    { where: { id: notificationId, userId } },
  );
  return updated > 0;
}

// ── Cleanup old notifications (called by cron) ──

export async function cleanupOldNotifications(daysOld = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const deleted = await Notification.destroy({
    where: { createdAt: { [Op.lt]: cutoff } },
  });

  if (deleted > 0)
    logger.info(
      `Cleaned up ${deleted} notifications older than ${daysOld} days`,
    );
  return deleted;
}
