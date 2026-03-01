"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheRoute = cacheRoute;
const cache_1 = require("../shared/utils/cache");
const redis_1 = require("../config/redis");
function cacheRoute(prefix, ttlSeconds = cache_1.CacheTTL.MEDIUM, options = {}) {
    return async (req, res, next) => {
        // Skip caching if Redis is down — just pass through
        if (!(0, redis_1.isRedisConnected)()) {
            next();
            return;
        }
        // Only cache GET requests
        if (req.method !== 'GET') {
            next();
            return;
        }
        // Build cache key
        let cacheKey;
        if (options.keyBuilder) {
            cacheKey = options.keyBuilder(req);
        }
        else {
            const queryString = Object.keys(req.query)
                .filter((k) => req.query[k] !== undefined && req.query[k] !== '')
                .sort()
                .map((k) => `${k}=${req.query[k]}`)
                .join('&');
            const userSegment = options.perUser && req.user
                ? `:u${req.user.id}`
                : '';
            cacheKey = `${prefix}${userSegment}:${req.path}:${queryString || 'default'}`;
        }
        // Try to get from cache
        try {
            const cached = await (0, cache_1.cacheGet)(cacheKey);
            if (cached) {
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Cache-Key', cacheKey);
                res.status(cached.statusCode).json(cached.body);
                return;
            }
        }
        catch {
            // Cache read failed — continue to handler
        }
        // Cache miss — intercept the response to cache it
        res.setHeader('X-Cache', 'MISS');
        const originalJson = res.json.bind(res);
        res.json = ((body) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                (0, cache_1.cacheSet)(cacheKey, { body, statusCode: res.statusCode }, ttlSeconds).catch(() => { });
            }
            return originalJson(body);
        });
        next();
    };
}
//# sourceMappingURL=cache.middleware.js.map