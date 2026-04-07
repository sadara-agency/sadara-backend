import { CookieOptions } from "express";
import { env } from "@config/env";

export const COOKIE_NAME = "sadara_token";
export const REFRESH_COOKIE_NAME = "sadara_refresh";

const isProduction = env.nodeEnv === "production";

/** Parse time strings like "1h", "30d", "15m" to milliseconds. */
function parseExpiryMs(val: string, fallback: number): number {
  const match = val.match(/^(\d+)([smhd])$/);
  if (!match) return fallback;
  const n = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (multipliers[match[2]] ?? fallback);
}

// Access token cookie — short-lived (matches JWT_EXPIRES_IN, default 1h)
export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: parseExpiryMs(env.jwt.expiresIn, 60 * 60 * 1000),
  path: "/",
};

// Refresh token cookie — long-lived (matches JWT_REFRESH_EXPIRES_IN, default 30d)
// Path is "/" to ensure the cookie is always sent (proxied/rewritten paths were dropping it)
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: parseExpiryMs(env.jwt.refreshExpiresIn, 30 * 24 * 60 * 60 * 1000),
  path: "/",
};

export const CLEAR_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

export const CLEAR_REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};
