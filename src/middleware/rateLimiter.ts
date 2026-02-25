import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient, isRedisConnected } from '../config/redis';

// ═══════════════════════════════════════════════════════════
// Rate Limiter — Redis-backed (falls back to in-memory)
// ═══════════════════════════════════════════════════════════

function getStore() {
  if (isRedisConnected()) {
    const client = getRedisClient()!;
    return new RedisStore({
      // Use `sendCommand` for compatibility with redis v4+
      sendCommand: (...args: string[]) => client.sendCommand(args),
      prefix: 'rl:',
    });
  }
  // Falls back to express-rate-limit's default MemoryStore
  return undefined;
}

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
});

// Strict limit for auth endpoints (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
});

// Very strict limit for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore(),
});