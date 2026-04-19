import Redis, { RedisOptions } from "ioredis";
import { env } from "@config/env";
import { logger } from "@config/logger";

let queueRedis: Redis | null = null;

function parseRedisUrlForIoRedis(url: string): RedisOptions {
  const u = new URL(url);
  const isTLS = u.protocol === "rediss:";
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    password: u.password || undefined,
    username: u.username || undefined,
    ...(isTLS ? { tls: {} } : {}),
    maxRetriesPerRequest: null, // REQUIRED by BullMQ workers
    enableReadyCheck: false, // REQUIRED by BullMQ workers
    lazyConnect: true,
  };
}

export function getQueueRedis(): Redis {
  if (!env.redis.url) {
    throw new Error("REDIS_URL is required for BullMQ queues");
  }
  if (!queueRedis) {
    queueRedis = new Redis(parseRedisUrlForIoRedis(env.redis.url));
    queueRedis.on("error", (err) =>
      logger.error("Queue Redis error", { error: err.message }),
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
  return parseRedisUrlForIoRedis(env.redis.url);
}
