import { Request, Response, NextFunction } from "express";
import { sendError } from "@shared/utils/apiResponse";

/**
 * Readiness gate.
 *
 * The HTTP server starts listening BEFORE init finishes (see index.ts bootstrap:
 * "Start HTTP server FIRST so Cloud Run/Fly sees the port open quickly"). During
 * that warmup window the DB connect, migrations, model.sync() and — critically —
 * `setupAssociations()` have not yet run. Any request that reaches a route using
 * an eager-loading `include` in that window throws
 * `<Model> is not associated to <Model>!` and surfaces as an unhandled 500.
 *
 * This middleware returns a clean 503 for application routes until init completes
 * (`appReady === true`), so clients and the platform load balancer retry instead
 * of hitting half-initialized handlers. `/api/health` is mounted BEFORE this gate
 * in app.ts and is therefore exempt — probes keep working during startup.
 *
 * `appReady` lives in index.ts, which imports `app` from app.ts. A static import
 * here would be circular, so we read the flag via a lazy dynamic import — the same
 * pattern the health route already uses.
 */
export async function readinessGate(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { appReady } = await import("../index");
  if (appReady) {
    next();
    return;
  }
  res.setHeader("Retry-After", "5");
  sendError(res, "Service is warming up, please retry shortly", 503);
}
