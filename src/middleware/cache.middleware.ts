import { Request, Response, NextFunction } from "express";
import { cacheGet, cacheSet, CacheTTL } from "@shared/utils/cache";
import { isRedisConnected } from "@config/redis";
import { AuthRequest } from "@shared/types";
import { logger } from "@config/logger";

interface CacheRouteOptions {
  /** Include user ID in cache key for per-user caching (default: false) */
  perUser?: boolean;
  /** Custom key builder if default isn't sufficient */
  keyBuilder?: (req: Request) => string;
}

export function cacheRoute(
  prefix: string,
  ttlSeconds: number = CacheTTL.MEDIUM,
  options: CacheRouteOptions = {},
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Skip caching if Redis is down — just pass through
    if (!isRedisConnected()) {
      next();
      return;
    }

    // Only cache GET requests
    if (req.method !== "GET") {
      next();
      return;
    }

    // Build cache key
    let cacheKey: string;
    if (options.keyBuilder) {
      cacheKey = options.keyBuilder(req);
    } else {
      // Normalize query params: sorted, trimmed, skip defaults that don't change results
      const SKIP_PARAMS = new Set(["_", "t", "timestamp"]); // cache-busting params
      const queryString = Object.keys(req.query)
        .filter(
          (k) =>
            req.query[k] !== undefined &&
            req.query[k] !== "" &&
            !SKIP_PARAMS.has(k),
        )
        .sort()
        .map((k) => `${k}=${req.query[k]}`)
        .join("&");

      const userSegment =
        options.perUser && (req as AuthRequest).user
          ? `:u${(req as AuthRequest).user!.id}`
          : "";

      const roleSegment = (req as AuthRequest).user
        ? `:r${(req as AuthRequest).user!.role}`
        : "";

      cacheKey = `${prefix}${userSegment}${roleSegment}:${req.path}:${queryString || "default"}`;
    }

    // Try to get from cache
    try {
      const cached = await cacheGet<{ body: any; statusCode: number }>(
        cacheKey,
      );

      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.status(cached.statusCode).json(cached.body);
        return;
      }
    } catch {
      // Cache read failed — continue to handler
    }

    // Cache miss — intercept the response to cache it
    res.setHeader("X-Cache", "MISS");

    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(
          cacheKey,
          { body, statusCode: res.statusCode },
          ttlSeconds,
        ).catch((err) =>
          logger.warn("Cache write failed", {
            key: cacheKey,
            error: (err as Error).message,
          }),
        );
      }
      return originalJson(body);
    }) as any;

    next();
  };
}
