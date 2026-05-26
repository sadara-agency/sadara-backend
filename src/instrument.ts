// Sentry initialization — MUST be the first import in src/index.ts.
// Reads SENTRY_DSN directly from process.env (env.ts loads .env files at
// module top-level on import, so process.env is already populated by the
// time this file evaluates). If DSN is unset, Sentry no-ops silently.
import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    sendDefaultPii: true,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}
