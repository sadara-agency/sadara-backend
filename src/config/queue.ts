import Redis, { RedisOptions } from "ioredis";
import { env } from "@config/env";
import { logger } from "@config/logger";

let queueRedis: Redis | null = null;

// Base ioredis options shared by all connections. BullMQ requires
// maxRetriesPerRequest=null and enableReadyCheck=false.
// keepAlive prevents GCP/Cloud Run's NAT layer from silently dropping
// idle TCP connections (default NAT timeout is ~1200 s). Without it,
// ioredis enters "close" status on the next command and throws
// "Connection is closed" instead of transparently reconnecting.
function buildRedisOptions(url: string, lazyConnect = false): RedisOptions {
  const u = new URL(url);
  const isTLS = u.protocol === "rediss:";
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    password: u.password || undefined,
    username: u.username || undefined,
    ...(isTLS ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    keepAlive: 10_000,
    connectTimeout: 10_000,
    ...(lazyConnect ? { lazyConnect: true } : {}),
    retryStrategy: (times: number) => {
      if (times > 20) return null; // surface failure after ~20 s of retries
      return Math.min(times * 200, 2_000);
    },
    reconnectOnError: () => true,
  };
}

export function getQueueRedis(): Redis {
  if (!env.redis.url) {
    throw new Error("REDIS_URL is required for BullMQ queues");
  }
  if (!queueRedis) {
    queueRedis = new Redis(buildRedisOptions(env.redis.url, true));
    queueRedis.on("error", (err) =>
      logger.error("Queue Redis error", { error: err }),
    );
    queueRedis.on("ready", () => logger.info("Queue Redis (ioredis) ready"));
  }
  return queueRedis;
}

export async function closeQueueRedis(): Promise<void> {
  if (queueRedis) {
    await queueRedis.quit().catch(() => queueRedis?.disconnect());
    queueRedis = null;
  }
}

/** Shared BullMQ connection config — pass to Queue/Worker constructors via `{ connection }`. */
export function getQueueConnection(): RedisOptions {
  if (!env.redis.url) throw new Error("REDIS_URL is required");
  // No lazyConnect for BullMQ — it must establish the connection eagerly
  // so that job enqueue/processing doesn't race with the initial handshake.
  return buildRedisOptions(env.redis.url, false);
}
