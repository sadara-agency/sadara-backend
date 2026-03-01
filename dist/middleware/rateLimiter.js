"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = require("rate-limit-redis");
const redis_1 = require("../config/redis");
// ═══════════════════════════════════════════════════════════
// Rate Limiter — Redis-backed (falls back to in-memory)
// ═══════════════════════════════════════════════════════════
function getStore() {
    if ((0, redis_1.isRedisConnected)()) {
        const client = (0, redis_1.getRedisClient)();
        return new rate_limit_redis_1.RedisStore({
            // Use `sendCommand` for compatibility with redis v4+
            sendCommand: (...args) => client.sendCommand(args),
            prefix: 'rl:',
        });
    }
    // Falls back to express-rate-limit's default MemoryStore
    return undefined;
}
// General API rate limit
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { success: false, message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
});
// Strict limit for auth endpoints (login, register)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    message: { success: false, message: 'Too many auth attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
});
// Very strict limit for password reset
exports.passwordResetLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: 'Too many password reset attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    store: getStore(),
});
//# sourceMappingURL=rateLimiter.js.map