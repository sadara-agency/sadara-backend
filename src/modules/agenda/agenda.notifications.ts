import { logger } from "@config/logger";
import { getRedisClient } from "@config/redis";
import type {
  NotificationType,
  NotificationPriority,
} from "@modules/notifications/notification.model";

interface AgendaNotificationPayload {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  titleAr?: string;
  body?: string;
  bodyAr?: string;
  link?: string;
  sourceId?: string;
}

/**
 * Thin dispatcher that routes to SSE today; email/push branches plug in here later.
 * Respects quiet hours and "already viewed today" suppression.
 */
export async function dispatchAgendaNotification(
  userId: string,
  payload: AgendaNotificationPayload,
  channels: string[] = ["sse"],
) {
  const redis = getRedisClient();

  // Suppress if within quiet hours (stored in user prefs — check Redis key)
  if (redis) {
    const quietKey = `agenda:quiet:${userId}`;
    const isQuiet = await redis.exists(quietKey);
    if (isQuiet) {
      // Defer to sorted set for later delivery
      await redis.zAdd("agenda:deferred", {
        score: Date.now(),
        value: JSON.stringify({ userId, payload, channels }),
      });
      logger.debug("[AGENDA] Notification deferred (quiet hours)", { userId });
      return;
    }
  }

  if (channels.includes("sse")) {
    await sendSseNotification(userId, payload);
  }

  // Future: email, push branches here
}

async function sendSseNotification(
  userId: string,
  payload: AgendaNotificationPayload,
) {
  try {
    const { createNotification } =
      await import("@modules/notifications/notification.service");
    await createNotification({
      userId,
      type: payload.type,
      title: payload.title,
      titleAr: payload.titleAr,
      body: payload.body,
      bodyAr: payload.bodyAr,
      link: payload.link,
      sourceType: "agenda",
      sourceId: payload.sourceId,
      priority: payload.priority,
    });
  } catch (err) {
    logger.error("[AGENDA] Failed to send SSE notification", {
      userId,
      error: (err as Error).message,
    });
  }
}

/**
 * Flush deferred notifications whose quiet window has passed.
 * Called by the agenda-deferred-flush cron every 15 min.
 */
export async function flushDeferredNotifications() {
  const redis = getRedisClient();
  if (!redis) return;

  const now = Date.now();
  const items = await redis.zRangeByScore("agenda:deferred", 0, now);
  if (!items.length) return;

  for (const item of items) {
    try {
      const { userId, payload, channels } = JSON.parse(item) as {
        userId: string;
        payload: AgendaNotificationPayload;
        channels: string[];
      };
      await dispatchAgendaNotification(userId, payload, channels);
    } catch (err) {
      logger.error("[AGENDA] Failed to flush deferred notification", {
        error: (err as Error).message,
      });
    }
  }

  await redis.zRemRangeByScore("agenda:deferred", 0, now);
  logger.info("[AGENDA] Flushed deferred notifications", {
    count: items.length,
  });
}

/**
 * Send morning digest to a user.
 * Suppressed if user has already viewed the agenda today.
 */
export async function sendMorningDigest(
  userId: string,
  taskCount: number,
  rolloverCount: number,
) {
  if (taskCount === 0 && rolloverCount === 0) return;

  const redis = getRedisClient();
  const alreadyViewed =
    redis && (await redis.exists(`agenda:lastView:${userId}`));

  const title = `Today's agenda: ${taskCount} task${taskCount !== 1 ? "s" : ""}${rolloverCount > 0 ? `, ${rolloverCount} unfinished` : ""}`;
  const titleAr = `أجندة اليوم: ${taskCount} مهمة${rolloverCount > 0 ? `، ${rolloverCount} غير مكتملة` : ""}`;

  if (alreadyViewed) {
    // Silent — write to DB only, no SSE push
    try {
      const { createNotification } =
        await import("@modules/notifications/notification.service");
      await createNotification({
        userId,
        type: "task",
        title,
        titleAr,
        priority: "normal",
        sourceType: "agenda",
        link: "/dashboard/agenda",
      });
    } catch {
      // swallow
    }
    return;
  }

  await dispatchAgendaNotification(userId, {
    type: "task",
    priority: "normal",
    title,
    titleAr,
    body: "Open your agenda to plan your day.",
    bodyAr: "افتح أجندتك لتخطيط يومك.",
    link: "/dashboard/agenda",
  });
}
