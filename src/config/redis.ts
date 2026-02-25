import { createClient, RedisClientType } from 'redis';
import { env } from './env';

// ═══════════════════════════════════════════════════════════
// Redis Client — Singleton with Graceful Fallback
// ═══════════════════════════════════════════════════════════

let redisClient: RedisClientType | null = null;
let isConnected = false;

export async function initRedis(): Promise<RedisClientType | null> {
    console.log('🔍 REDIS_URL:', env.redis.url ? `${env.redis.url.substring(0, 20)}...` : '(empty)');
    if (!env.redis.url) {
        console.warn('⚠️  REDIS_URL not configured — caching disabled, using in-memory fallback');
        return null;
    }

    try {
        redisClient = createClient({
            url: env.redis.url,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('❌ Redis max reconnection attempts reached');
                        return new Error('Redis max retries');
                    }
                    return Math.min(retries * 200, 3000);
                },
            },
        });

        redisClient.on('connect', () => {
            console.log('🔄 Redis connecting...');
        });

        redisClient.on('ready', () => {
            isConnected = true;
            console.log('✅ Redis connected and ready');
        });

        redisClient.on('error', (err) => {
            console.error('❌ Redis error:', err.message);
            isConnected = false;
        });

        redisClient.on('end', () => {
            isConnected = false;
            console.log('🔌 Redis disconnected');
        });

        await redisClient.connect();
        return redisClient;
    } catch (err: any) {
        console.error('❌ Redis initialization failed:', err.message);
        console.warn('⚠️  Continuing without Redis — caching disabled');
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
        console.log('🔌 Redis connection closed');
    }
}