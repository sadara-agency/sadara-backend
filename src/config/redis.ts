import { createClient, RedisClientType } from "redis";
import { env } from "@config/env";
import { logger } from "@config/logger";
import { withTimeout } from "@shared/utils/timeout";

// ═══════════════════════════════════════════════════════════
// Redis Client — Singleton with Graceful Fallback
// ═══════════════════════════════════════════════════════════

let redisClient: RedisClientType | null = null;
let isConnected = false;

export async function initRedis(): Promise<RedisClientType | null> {
  if (!env.redis.url) {
    logger.warn(
      "REDIS_URL not configured — caching disabled, using in-memory fallback",
    );
    return null;
  }

  try {
    // Determine if TLS is needed based on URL scheme
    const isTLS = env.redis.url.startsWith("rediss://");

    redisClient = createClient({
      url: env.redis.url,
      socket: {
        connectTimeout: 5000,
        ...(isTLS ? { tls: true as const } : {}),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error("Redis max reconnection attempts reached");
            return new Error("Redis max retries");
          }
          return Math.min(retries * 200, 3000);
        },
      },
    });

    redisClient.on("connect", () => {
      logger.info("Redis connecting...");
    });

    redisClient.on("ready", () => {
      isConnected = true;
      logger.info("Redis connected and ready");
    });

    redisClient.on("error", (err) => {
      logger.error("Redis error", { error: err.message });
      isConnected = false;
    });

    redisClient.on("end", () => {
      isConnected = false;
      logger.info("Redis disconnected");
    });

    await redisClient.connect();
    return redisClient;
  } catch (err: any) {
    logger.error("Redis initialization failed", { error: err.message });
    logger.warn("Continuing without Redis — caching disabled");
    redisClient = null;
    return null;
  }
}

export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await withTimeout(redisClient.quit(), 5_000, "Redis close");
    } catch {
      try {
        redisClient.disconnect();
      } catch {
        /* ignore */
      }
    }
    redisClient = null;
    isConnected = false;
    logger.info("Redis connection closed");
  }
}
