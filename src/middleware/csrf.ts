/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * Sets a non-httpOnly cookie with a random token on every response.
 * On state-changing requests (POST/PUT/PATCH/DELETE), validates that
 * the X-CSRF-Token header matches the cookie value.
 *
 * An attacker's site can send cookies but cannot read them (SameSite/CORS),
 * so it cannot set the header — blocking cross-site request forgery.
 */
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "@config/env";
import { logger } from "@config/logger";

const CSRF_COOKIE = "sadara_csrf";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Paths exempt from CSRF (no session cookie yet or automated refresh). */
const EXEMPT_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/forgot-password",
  // Email-link endpoints: the one-time token in the URL is itself the proof of intent,
  // and recipients click these from a fresh browser context that has no CSRF cookie yet.
  "/api/v1/auth/verify-email",
  "/api/v1/auth/resend-verification",
  "/api/v1/auth/reset-password",
  "/api/health",
]);

const isProduction = env.nodeEnv === "production";

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // 1. Always set/refresh the CSRF cookie so the frontend can read it
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Frontend JS must read this
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // 2. Skip validation for safe methods
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // 3. Skip exempt paths
  if (EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  // 4. Validate: header must match cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    if (env.csrf.enforce) {
      res.status(403).json({
        success: false,
        message: "CSRF token validation failed",
      });
      return;
    }
    // Log-only mode: warn but allow the request through
    logger.warn("CSRF token mismatch (non-enforcing)", {
      path: req.path,
      method: req.method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
    });
  }

  next();
}
