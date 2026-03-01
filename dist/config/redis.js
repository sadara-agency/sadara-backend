"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRedis = initRedis;
exports.getRedisClient = getRedisClient;
exports.isRedisConnected = isRedisConnected;
exports.closeRedis = closeRedis;
const redis_1 = require("redis");
const env_1 = require("./env");
// ═══════════════════════════════════════════════════════════
// Redis Client — Singleton with Graceful Fallback
// ═══════════════════════════════════════════════════════════
let redisClient = null;
let isConnected = false;
async function initRedis() {
    if (!env_1.env.redis.url) {
        console.warn('⚠️  REDIS_URL not configured — caching disabled, using in-memory fallback');
        return null;
    }
    try {
        redisClient = (0, redis_1.createClient)({
            url: env_1.env.redis.url,
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
    }
    catch (err) {
        console.error('❌ Redis initialization failed:', err.message);
        console.warn('⚠️  Continuing without Redis — caching disabled');
        redisClient = null;
        return null;
    }
}
function getRedisClient() {
    return redisClient;
}
function isRedisConnected() {
    return isConnected && redisClient !== null;
}
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        isConnected = false;
        console.log('🔌 Redis connection closed');
    }
}
//# sourceMappingURL=redis.js.map