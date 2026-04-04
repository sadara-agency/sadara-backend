import { CookieOptions } from "express";
import { env } from "@config/env";

export const COOKIE_NAME = "sadara_token";
export const REFRESH_COOKIE_NAME = "sadara_refresh";

const isProduction = env.nodeEnv === "production";

// Access token cookie — short-lived (15 min)
export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
};

// Refresh token cookie — long-lived (30 days), scoped to auth path
export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/api/v1/auth",
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
  path: "/api/v1/auth",
};
