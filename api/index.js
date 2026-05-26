// Vercel serverless entry for the Sadara backend.
//
// IMPORTANT: This deploys ONLY the Express HTTP layer to Vercel. It intentionally
// imports the compiled app (dist/app.js) and NOT dist/index.js — index.ts is the
// Cloud Run bootstrap that starts BullMQ workers, cron jobs, the Redis SSE
// subscriber and calls app.listen(). None of that can run in a serverless
// function (no long-lived process), so it is deliberately excluded here.
//
// Consequences on Vercel:
//   - DB: Sequelize connects lazily on the first query (pool is fine per-invocation).
//   - Redis: stays disconnected; cache helpers are guarded and become no-ops.
//   - BullMQ queue workers / cron / SSE: DO NOT RUN. Keep those on Cloud Run.
//
// dist/ is produced by `npm run build` (tsc + tsc-alias), which is wired up as the
// buildCommand in vercel.json. tsc-alias rewrites the @config/* path aliases to
// real relative requires — that rewrite is what fixes the original
// "Cannot find module '@config/env'" crash.

const app = require("../dist/app").default;

module.exports = app;
