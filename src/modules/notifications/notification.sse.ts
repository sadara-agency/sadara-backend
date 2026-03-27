// ─────────────────────────────────────────────────────────────
// Server-Sent Events (SSE) for Real-Time Notifications
// ─────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@config/env";
import { getRedisClient } from "@config/redis";
import { COOKIE_NAME } from "@shared/utils/cookie";
import { AuthUser } from "@shared/types";
import { logger } from "@config/logger";
import { withTimeout } from "@shared/utils/timeout";
import type { RedisClientType } from "redis";

// ── SSE Notification Payload ──

export interface SSENotificationPayload {
  id: string;
  type: string;
  title: string;
  titleAr?: string | null;
  body?: string | null;
  bodyAr?: string | null;
  link?: string | null;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

// ── Connection Store ──
// Maps userId → Set of active SSE Response objects (supports multiple tabs/devices)

const connections = new Map<string, Set<Response>>();
let subscriberClient: RedisClientType | null = null;

// ── Helpers ──

function sendSSE(res: Response, event: string, data: unknown): boolean {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

function sendToUser(userId: string, payload: SSENotificationPayload): void {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return;

  for (const res of userConns) {
    const ok = sendSSE(res, "notification", payload);
    if (!ok) {
      // Dead connection — clean up
      userConns.delete(res);
      logger.debug(`Removed dead SSE connection for user ${userId}`);
    }
  }

  if (userConns.size === 0) {
    connections.delete(userId);
  }
}

// ── Redis Pub/Sub ──

const CHANNEL_PREFIX = "notifications:";

export async function initSSESubscriber(): Promise<void> {
  const mainClient = getRedisClient();
  if (!mainClient) {
    logger.warn("SSE: Redis not available — operating in single-instance mode");
    return;
  }

  try {
    // Redis v5 requires a dedicated client for subscriptions
    subscriberClient = mainClient.duplicate() as RedisClientType;
    await withTimeout(subscriberClient.connect(), 10_000, "SSE Redis connect");

    // Pattern subscribe to all notification channels
    await subscriberClient.pSubscribe(
      `${CHANNEL_PREFIX}*`,
      (message: string, channel: string) => {
        // Extract userId from channel: "notifications:{userId}"
        const userId = channel.slice(CHANNEL_PREFIX.length);
        if (!userId) return;

        try {
          const payload = JSON.parse(message) as SSENotificationPayload;
          sendToUser(userId, payload);
        } catch (err) {
          logger.error("SSE: Failed to parse Redis message", {
            channel,
            error: (err as Error).message,
          });
        }
      },
    );

    logger.info("SSE subscriber initialized (Redis Pub/Sub)");
  } catch (err) {
    logger.error("SSE: Failed to initialize Redis subscriber", {
      error: (err as Error).message,
    });
    subscriberClient = null;
  }
}

export async function publishNotification(
  userId: string,
  payload: SSENotificationPayload,
): Promise<void> {
  const mainClient = getRedisClient();

  if (mainClient) {
    try {
      await mainClient.publish(
        `${CHANNEL_PREFIX}${userId}`,
        JSON.stringify(payload),
      );
      return;
    } catch (err) {
      logger.debug(
        "SSE: Redis publish failed, falling back to local delivery",
        {
          error: (err as Error).message,
        },
      );
    }
  }

  // Fallback: deliver directly to local connections
  sendToUser(userId, payload);
}

export async function closeSSESubscriber(): Promise<void> {
  if (subscriberClient) {
    try {
      await withTimeout(
        subscriberClient
          .pUnsubscribe(`${CHANNEL_PREFIX}*`)
          .then(() => subscriberClient!.quit()),
        5_000,
        "SSE Redis close",
      );
    } catch {
      // Timeout or error during shutdown — force disconnect
      try {
        subscriberClient.disconnect();
      } catch {
        /* ignore */
      }
    }
    subscriberClient = null;
  }

  // Close all active connections
  for (const [, conns] of connections) {
    for (const res of conns) {
      try {
        res.end();
      } catch {
        // Ignore
      }
    }
  }
  connections.clear();
  logger.info("SSE subscriber closed");
}

// ── SSE Connection Handler ──

function extractToken(req: Request): string | undefined {
  // 1. httpOnly cookie
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  // 2. Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  // 3. Query param (EventSource can't set headers, some clients use this)
  if (typeof req.query.token === "string") {
    return req.query.token;
  }
  return undefined;
}

export function handleSSEConnection(req: Request, res: Response): void {
  // ── Auth ──
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  let user: AuthUser;
  try {
    user = jwt.verify(token, env.jwt.secret) as AuthUser;
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const userId = user.id;

  // ── SSE Headers ──
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Nginx: disable buffering
  });

  // Initial event
  sendSSE(res, "connected", { userId });

  // ── Register Connection ──
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(res);

  logger.debug(
    `SSE: User ${userId} connected (${connections.get(userId)!.size} active)`,
  );

  // ── Heartbeat (keep TCP alive through proxies) ──
  const heartbeat = setInterval(() => {
    try {
      res.write(":heartbeat\n\n");
    } catch {
      // Connection dead — cleanup will happen in "close" handler
      clearInterval(heartbeat);
    }
  }, 30_000);

  // ── Cleanup on disconnect ──
  req.on("close", () => {
    clearInterval(heartbeat);

    const userConns = connections.get(userId);
    if (userConns) {
      userConns.delete(res);
      if (userConns.size === 0) {
        connections.delete(userId);
      }
    }

    logger.debug(`SSE: User ${userId} disconnected`);
  });
}

// ── Custom SSE Events (non-notification) ──

/**
 * Send a custom SSE event to a specific user (e.g. force_logout).
 * Unlike publishNotification, this sends an arbitrary event type
 * and does NOT go through Redis pub/sub — local connections only.
 */
export function sendCustomSSE(
  userId: string,
  event: string,
  data: unknown,
): void {
  const userConns = connections.get(userId);
  if (!userConns || userConns.size === 0) return;

  for (const res of userConns) {
    const ok = sendSSE(res, event, data);
    if (!ok) {
      userConns.delete(res);
    }
  }

  if (userConns.size === 0) {
    connections.delete(userId);
  }
}

// ── Stats (for health check) ──

export function getSSEStats(): {
  totalConnections: number;
  uniqueUsers: number;
} {
  let totalConnections = 0;
  for (const conns of connections.values()) {
    totalConnections += conns.size;
  }
  return { totalConnections, uniqueUsers: connections.size };
}
