import { createClient, RedisClientType } from "redis";
import { env } from "./env";

// ═══════════════════════════════════════════════════════════
// Redis Client — Singleton with Graceful Fallback
// ═══════════════════════════════════════════════════════════

let redisClient: RedisClientType | null = null;
let isConnected = false;

export async function initRedis(): Promise<RedisClientType | null> {
  if (!env.redis.url) {
    console.warn(
      "⚠️  REDIS_URL not configured — caching disabled, using in-memory fallback",
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
            console.error("❌ Redis max reconnection attempts reached");
            return new Error("Redis max retries");
          }
          return Math.min(retries * 200, 3000);
        },
      },
    });

    redisClient.on("connect", () => {
      console.log("🔄 Redis connecting...");
    });

    redisClient.on("ready", () => {
      isConnected = true;
      console.log("✅ Redis connected and ready");
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
      isConnected = false;
    });

    redisClient.on("end", () => {
      isConnected = false;
      console.log("🔌 Redis disconnected");
    });

    await redisClient.connect();
    return redisClient;
  } catch (err: any) {
    console.error("❌ Redis initialization failed:", err.message);
    console.warn("⚠️  Continuing without Redis — caching disabled");
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
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    console.log("🔌 Redis connection closed");
  }
}
