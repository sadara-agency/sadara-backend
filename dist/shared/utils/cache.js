"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachePrefix = exports.CacheTTL = void 0;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
exports.invalidateByPrefix = invalidateByPrefix;
exports.invalidateMultiple = invalidateMultiple;
exports.buildCacheKey = buildCacheKey;
exports.cacheOrFetch = cacheOrFetch;
const redis_1 = require("../../config/redis");
// Default TTL values (in seconds)
exports.CacheTTL = {
    SHORT: 60, // 1 min  — volatile data (dashboard stats)
    MEDIUM: 300, // 5 min  — lists (players, clubs, contracts)
    LONG: 900, // 15 min — rarely changing (settings, roles)
    HOUR: 3600, // 1 hour — reference data
    DAY: 86400, // 1 day  — static lookups
};
// Cache key prefixes for organized invalidation
exports.CachePrefix = {
    DASHBOARD: 'dash',
    PLAYERS: 'players',
    PLAYER: 'player',
    CLUBS: 'clubs',
    CONTRACTS: 'contracts',
    OFFERS: 'offers',
    FINANCE: 'finance',
    MATCHES: 'matches',
    TASKS: 'tasks',
    SCOUTING: 'scouting',
    SETTINGS: 'settings',
    GATES: 'gates',
    REFERRALS: 'referrals',
    REPORTS: 'reports',
};
// ── Core Operations ──
/**
 * Get a cached value. Returns null if not found or Redis unavailable.
 */
async function cacheGet(key) {
    if (!(0, redis_1.isRedisConnected)())
        return null;
    try {
        const client = (0, redis_1.getRedisClient)();
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (err) {
        console.warn(`⚠️  Cache GET failed [${key}]:`, err.message);
        return null;
    }
}
/**
 * Set a cached value with TTL.
 */
async function cacheSet(key, value, ttlSeconds = exports.CacheTTL.MEDIUM) {
    if (!(0, redis_1.isRedisConnected)())
        return false;
    try {
        const client = (0, redis_1.getRedisClient)();
        await client.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
    }
    catch (err) {
        console.warn(`⚠️  Cache SET failed [${key}]:`, err.message);
        return false;
    }
}
/**
 * Delete a specific cache key.
 */
async function cacheDel(key) {
    if (!(0, redis_1.isRedisConnected)())
        return false;
    try {
        const client = (0, redis_1.getRedisClient)();
        await client.del(key);
        return true;
    }
    catch (err) {
        console.warn(`⚠️  Cache DEL failed [${key}]:`, err.message);
        return false;
    }
}
/**
 * Invalidate all keys matching a prefix.
 * Use after mutations (create, update, delete) to bust relevant caches.
 *
 * Example: after creating a player, call invalidateByPrefix('players')
 * to clear all player list caches regardless of query params.
 */
async function invalidateByPrefix(prefix) {
    if (!(0, redis_1.isRedisConnected)())
        return 0;
    try {
        const client = (0, redis_1.getRedisClient)();
        let cursor = '0';
        let deletedCount = 0;
        do {
            const result = await client.scan(cursor, {
                MATCH: `${prefix}:*`,
                COUNT: 100,
            });
            cursor = String(result.cursor);
            if (result.keys.length > 0) {
                await client.del(result.keys);
                deletedCount += result.keys.length;
            }
        } while (cursor !== '0');
        if (deletedCount > 0) {
            console.log(`🗑️  Cache invalidated: ${deletedCount} keys matching "${prefix}:*"`);
        }
        return deletedCount;
    }
    catch (err) {
        console.warn(`⚠️  Cache invalidation failed [${prefix}:*]:`, err.message);
        return 0;
    }
}
/**
 * Invalidate multiple prefixes at once.
 * Useful when a mutation affects multiple modules.
 *
 * Example: creating a contract affects contracts, players, and finance
 * invalidateMultiple(['contracts', 'player', 'finance', 'dash'])
 */
async function invalidateMultiple(prefixes) {
    await Promise.all(prefixes.map((p) => invalidateByPrefix(p)));
}
// ── Helper: Build Cache Key ──
/**
 * Build a deterministic cache key from prefix + params.
 * Sorts query params for consistent keys regardless of param order.
 *
 * Example: buildCacheKey('players', { page: 1, limit: 20, status: 'Active' })
 *       → 'players:limit=20&page=1&status=Active'
 */
function buildCacheKey(prefix, params) {
    if (!params || Object.keys(params).length === 0)
        return `${prefix}:all`;
    const sorted = Object.keys(params)
        .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');
    return `${prefix}:${sorted || 'all'}`;
}
// ── Helper: Cache-aside pattern ──
/**
 * Get from cache, or fetch from source and cache the result.
 * This is the most common pattern — use it in services.
 *
 * Example:
 *   const players = await cacheOrFetch(
 *     buildCacheKey('players', query),
 *     () => Player.findAll({ where: filters }),
 *     CacheTTL.MEDIUM
 *   );
 */
async function cacheOrFetch(key, fetchFn, ttlSeconds = exports.CacheTTL.MEDIUM) {
    // Try cache first
    const cached = await cacheGet(key);
    if (cached !== null)
        return cached;
    // Cache miss — fetch from DB
    const data = await fetchFn();
    // Store in cache (fire-and-forget, don't await)
    cacheSet(key, data, ttlSeconds).catch(() => { });
    return data;
}
//# sourceMappingURL=cache.js.map