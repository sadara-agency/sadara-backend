import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthRequest, AuthUser, UserRole } from "../shared/types";
import { sendUnauthorized, sendForbidden } from "../shared/utils/apiResponse";
import { COOKIE_NAME } from "../shared/utils/cookie";

/** Extract token from cookie (browser) or Authorization header (API clients). */
function extractToken(req: AuthRequest): string | undefined {
  // 1. httpOnly cookie (browser clients)
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  // 2. Authorization header (mobile/API clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return undefined;
}

// ── Verify JWT Token ──
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (!token) {
    sendUnauthorized(res, "No token provided");
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, "Token expired");
    } else {
      sendUnauthorized(res, "Invalid token");
    }
  }
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
