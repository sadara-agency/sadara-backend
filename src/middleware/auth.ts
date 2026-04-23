import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { QueryTypes } from "sequelize";
import { env } from "@config/env";
import { sequelize } from "@config/database";
import { AuthRequest, AuthUser, UserRole } from "@shared/types";
import {
  sendUnauthorized,
  sendForbidden,
  sendError,
} from "@shared/utils/apiResponse";
import { COOKIE_NAME } from "@shared/utils/cookie";
import {
  hasPermission,
  CrudAction,
} from "@modules/permissions/permission.service";
import { logger } from "@config/logger";
import { cacheGet, cacheSet, cacheDel } from "@shared/utils/cache";

// ── Active-status cache ──
// Key: `user_active:{userId}` → boolean. TTL: 60 s.
// On deactivation, set to false immediately. On re-activation, delete so it re-fetches.
export const USER_ACTIVE_CACHE_KEY = (id: string) => `user_active:${id}`;
const USER_ACTIVE_TTL = 60; // seconds

export async function isUserActive(userId: string): Promise<boolean> {
  const key = USER_ACTIVE_CACHE_KEY(userId);
  const cached = await cacheGet<boolean>(key);
  if (cached !== null) return cached;

  type Row = { is_active: boolean };
  const [row] = await sequelize.query<Row>(
    "SELECT is_active FROM users WHERE id = :id LIMIT 1",
    { replacements: { id: userId }, type: QueryTypes.SELECT },
  );
  const active = row?.is_active ?? false;
  await cacheSet(key, active, USER_ACTIVE_TTL).catch(() => {});
  return active;
}

// ── Throttle activity updates — at most once per 5 minutes per user
const activityCache = new Map<string, number>();
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;
const MAX_ACTIVITY_CACHE_SIZE = 1000;

function trackActivity(userId: string) {
  const now = Date.now();
  const last = activityCache.get(userId) || 0;
  if (now - last < ACTIVITY_THROTTLE_MS) return;
  activityCache.set(userId, now);

  // Evict stale entries when cache grows too large
  if (activityCache.size > MAX_ACTIVITY_CACHE_SIZE) {
    const cutoff = now - ACTIVITY_THROTTLE_MS;
    for (const [key, ts] of activityCache) {
      if (ts < cutoff) activityCache.delete(key);
    }
  }
  // Fire-and-forget — don't block the request
  sequelize
    .query("UPDATE users SET last_activity = NOW() WHERE id = :id", {
      replacements: { id: userId },
    })
    .catch((err) =>
      logger.warn("Activity update failed", {
        userId,
        error: (err as Error).message,
      }),
    );

  // Heartbeat the open session — lazy import avoids circular dependency
  import("@modules/staffMonitoring")
    .then(({ heartbeat }) => {
      heartbeat(userId).catch(() => {});
    })
    .catch(() => {});
}

/** Extract token from cookie (browser) or Authorization header (API clients). */
function extractToken(req: AuthRequest): string | undefined {
  // 1. httpOnly cookie (browser clients)
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  // 2. Authorization header (mobile/API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && /^bearer\s/i.test(authHeader)) {
    return authHeader.split(/\s+/)[1];
  }
  return undefined;
}

// ── Verify JWT Token ──
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    sendUnauthorized(res, "No token provided");
    return;
  }

  let decoded: AuthUser;
  try {
    decoded = jwt.verify(token, env.jwt.secret) as AuthUser;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, "Token expired");
    } else {
      sendUnauthorized(res, "Invalid token");
    }
    return;
  }

  // Check if the account is still active (Redis-cached, 60-second TTL).
  // Fail-closed: if Redis/DB is unavailable, return 503 rather than letting deactivated users through.
  try {
    const active = await isUserActive(decoded.id);
    if (!active) {
      sendUnauthorized(res, "Account deactivated");
      return;
    }
  } catch (err) {
    logger.error("isUserActive check failed — blocking request", {
      userId: decoded.id,
      error: (err as Error).message,
    });
    sendError(res, "Service temporarily unavailable", 503);
    return;
  }

  req.user = decoded;
  trackActivity(decoded.id);
  next();
}

// ── Role-based Authorization ──
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendForbidden(
        res,
        `Role '${req.user.role}' does not have access to this resource`,
      );
      return;
    }

    next();
  };
}

// ── Dynamic module-level authorization (DB-driven) ──
export function authorizeModule(module: string, action: CrudAction) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const allowed = await hasPermission(
        req.user.role,
        module,
        action,
        req.user.id,
      );
      if (!allowed) {
        sendForbidden(
          res,
          `Role '${req.user.role}' does not have '${action}' access to '${module}'`,
        );
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ── Optional auth (doesn't fail if no token) ──
export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (token) {
    try {
      req.user = jwt.verify(token, env.jwt.secret) as AuthUser;
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
}
