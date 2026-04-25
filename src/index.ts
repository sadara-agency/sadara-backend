// src/index.ts

import app from "./app";
import { env } from "@config/env";
import { testConnection, sequelize } from "@config/database";
import { initRedis, closeRedis } from "@config/redis";
import { seedDatabase } from "./database/seed";
import { seedProduction } from "./database/production.seed";
// NOTE: migrations are run by CI's pre-deploy step (`.github/workflows/ci-cd.yml`),
// NOT here. The container assumes the schema is already correct. A schema-version
// check below logs a WARN (not a crash) if the DB lags behind the code's expected
// migration. See plan: stop-cloudrun-crashloops.
import fs from "fs/promises";
import path from "path";
import { startSaffScheduler } from "@modules/saff/saff.scheduler";
import { startCronJobs } from "./cron/scheduler";
import { loadTaskRuleConfigFromDB } from "@modules/matches/matchAutoTasks";
import { loadPerformanceTrendConfig } from "./cron/engines/performance.engine";
import { loadInjuryIntelConfig } from "./cron/engines/injury.engine";
import { loadContractLifecycleConfig } from "./cron/engines/contract.engine";
import { loadFinancialIntelConfig } from "./cron/engines/financial.engine";
import { loadGateOnboardingConfig } from "./cron/engines/gate.engine";
import { loadScoutingPipelineConfig } from "./cron/engines/scouting.engine";
import { loadTrainingDevConfig } from "./cron/engines/training.engine";
import { loadSystemHealthConfig } from "./cron/engines/systemhealth.engine";
import { loadPermissions } from "@modules/permissions/permission.service";
import { ensureSportmonksColumn } from "@modules/sportmonks/sportmonks.service";
import { registerProvider } from "@modules/integrations/matchAnalysis.service";
import { WyscoutProvider } from "@modules/integrations/providers/wyscout";
import { setupAssociations } from "./models/associations";
import { withTimeout } from "@shared/utils/timeout";
import chalk from "chalk";
import gradient from "gradient-string";
import { logger } from "@config/logger";
import * as Sentry from "@sentry/node";
import {
  initSSESubscriber,
  closeSSESubscriber,
} from "@modules/notifications/notification.sse";

// ── Sentry Error Tracking (opt-in via SENTRY_DSN) ──
if (env.sentry?.dsn) {
  Sentry.init({
    dsn: env.sentry.dsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.nodeEnv === "production" ? 0.1 : 1.0,
  });
  logger.info("Sentry error tracking initialized");
}

// ─────────────────────────────────────────────
// Schema-version sanity check (advisory)
// ─────────────────────────────────────────────

/**
 * Compare the DB's last-applied migration (from `sequelize_meta`) to the
 * highest-numbered migration file shipped with this build. Logs a WARN on
 * mismatch but never throws — migration-running has been delegated to CI
 * (`.github/workflows/ci-cd.yml`'s pre-deploy step), so a mismatch here
 * means CI was skipped or its migrate step failed silently. Either way,
 * crashing the container wouldn't help — the operator needs visibility,
 * not a crashloop.
 */
async function checkSchemaVersion(): Promise<void> {
  try {
    // Filesystem expectation: highest-numbered migration file in src/database/migrations
    // (resolved relative to this compiled file: dist/index.js → dist/database/migrations,
    //  src/index.ts → src/database/migrations).
    const migrationsDir = path.join(__dirname, "database", "migrations");
    const files = await fs.readdir(migrationsDir);
    const expected = files
      .filter((f) => /^\d{3}_.*\.(ts|js)$/.test(f))
      .sort()
      .pop();

    // DB state: latest applied migration from sequelize_meta (created by Umzug).
    const [rows] = await sequelize.query(
      `SELECT name FROM sequelize_meta ORDER BY name DESC LIMIT 1`,
    );
    const applied = (rows as Array<{ name: string }>)[0]?.name;

    if (!applied) {
      logger.warn(
        "[boot] Schema check: no migrations applied yet — DB may be empty",
      );
      return;
    }

    // Compare ignoring extension (sequelize_meta stores `.js` in CI, `.ts` in dev).
    const stripExt = (s: string) => s.replace(/\.(ts|js)$/, "");
    if (expected && stripExt(applied) !== stripExt(expected)) {
      logger.warn(
        `[boot] Schema mismatch: code expects ${expected} but DB is at ${applied}. ` +
          `CI's migrate step may have been skipped — verify before relying on new features.`,
      );
      return;
    }
    logger.info(`[boot] Schema OK: at ${applied}`);
  } catch (err) {
    // Never fatal — a missing sequelize_meta table on a brand-new DB, a
    // permissions hiccup, or filesystem oddity shouldn't crashloop production.
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[boot] Schema check skipped: ${msg}`);
  }
}

// ─────────────────────────────────────────────
// Phase 1 — Infrastructure
// ─────────────────────────────────────────────

async function initInfrastructure(): Promise<void> {
  logger.info("[infra] Connecting to PostgreSQL...");
  await withTimeout(testConnection(), 30_000, "testConnection");
  logger.info("[infra] PostgreSQL connected");

  // Redis/SSE are non-critical — app works without them (in-memory fallback)
  try {
    logger.info("[infra] Connecting to Redis...");
    await withTimeout(initRedis(), 15_000, "initRedis");
    logger.info("[infra] Redis connected");
  } catch (err) {
    logger.warn("[infra] Redis unavailable — using in-memory fallback", {
      error: (err as Error).message,
    });
  }
  try {
    logger.info("[infra] Starting SSE subscriber...");
    await withTimeout(initSSESubscriber(), 10_000, "initSSESubscriber");
    logger.info("[infra] SSE subscriber ready");
  } catch (err) {
    logger.warn("[infra] SSE subscriber unavailable — notifications disabled", {
      error: (err as Error).message,
    });
  }

  // In production, migrations are the source of truth for schema.
  // model.sync() is only needed in development for convenience.
  if (env.nodeEnv !== "production") {
    const MODEL_SYNC_TIMEOUT = 15_000;
    const models = Object.values(sequelize.models);
    logger.info(`[infra] Syncing ${models.length} models...`);
    const failed: typeof models = [];
    for (const model of models) {
      try {
        await withTimeout(
          (model as any).sync({ alter: false }),
          MODEL_SYNC_TIMEOUT,
          `sync(${(model as any).tableName ?? model.name})`,
        );
      } catch {
        failed.push(model);
      }
    }
    if (failed.length > 0) {
      logger.info(`[infra] Retrying ${failed.length} failed model syncs...`);
    }
    for (const model of failed) {
      try {
        await withTimeout(
          (model as any).sync({ alter: false }),
          MODEL_SYNC_TIMEOUT,
          `sync-retry(${(model as any).tableName ?? model.name})`,
        );
      } catch {
        // Will be created by migrations
      }
    }
    logger.info("[infra] Model sync complete");
  }

  // Register associations AFTER tables exist so FK constraints are valid
  setupAssociations();
  logger.info("[infra] Model associations registered");
}

// ─────────────────────────────────────────────
// Phase 2 — Application
// ─────────────────────────────────────────────

async function initApplication(): Promise<void> {
  const CFG_TIMEOUT = 15_000;

  logger.info("[app] Seeding database...");
  if (env.nodeEnv === "production") {
    await withTimeout(seedProduction(), 60_000, "seedProduction");
  } else {
    await withTimeout(seedDatabase(), 120_000, "seedDatabase");
  }
  logger.info("[app] Database seeded");

  logger.info("[app] Loading permissions...");
  await withTimeout(loadPermissions(), CFG_TIMEOUT, "loadPermissions");

  logger.info("[app] Loading package configs...");
  const { loadPackageConfigsFromDB } =
    await import("@shared/utils/packageAccess");
  await withTimeout(
    loadPackageConfigsFromDB(),
    CFG_TIMEOUT,
    "loadPackageConfigs",
  );

  logger.info("[app] Loading engine configs...");
  const configResults = await Promise.allSettled([
    withTimeout(loadTaskRuleConfigFromDB(), CFG_TIMEOUT, "loadTaskRuleConfig"),
    withTimeout(
      loadPerformanceTrendConfig(),
      CFG_TIMEOUT,
      "loadPerformanceTrendConfig",
    ),
    withTimeout(loadInjuryIntelConfig(), CFG_TIMEOUT, "loadInjuryIntelConfig"),
    withTimeout(
      loadContractLifecycleConfig(),
      CFG_TIMEOUT,
      "loadContractLifecycleConfig",
    ),
    withTimeout(
      loadFinancialIntelConfig(),
      CFG_TIMEOUT,
      "loadFinancialIntelConfig",
    ),
    withTimeout(
      loadGateOnboardingConfig(),
      CFG_TIMEOUT,
      "loadGateOnboardingConfig",
    ),
    withTimeout(
      loadScoutingPipelineConfig(),
      CFG_TIMEOUT,
      "loadScoutingPipelineConfig",
    ),
    withTimeout(loadTrainingDevConfig(), CFG_TIMEOUT, "loadTrainingDevConfig"),
    withTimeout(
      loadSystemHealthConfig(),
      CFG_TIMEOUT,
      "loadSystemHealthConfig",
    ),
  ]);
  const configFailures = configResults.filter((r) => r.status === "rejected");
  if (configFailures.length > 0) {
    configFailures.forEach((r) =>
      logger.warn("[app] Engine config load failed", {
        error: (r as PromiseRejectedResult).reason?.message,
      }),
    );
  }
  logger.info("[app] All engine configs loaded");

  await withTimeout(
    ensureSportmonksColumn(),
    CFG_TIMEOUT,
    "ensureSportmonksColumn",
  );
  registerProviders();
}

function registerProviders(): void {
  if (env.wyscout.apiKey) {
    registerProvider(
      new WyscoutProvider(env.wyscout.apiKey, env.wyscout.baseUrl),
    );
    logger.info("Wyscout match analysis provider registered");
  }
}

// ─────────────────────────────────────────────
// Phase 3 — Background Jobs
// ─────────────────────────────────────────────

async function startSchedulers(): Promise<void> {
  logger.info("[jobs] Starting SAFF scheduler...");
  startSaffScheduler();
  logger.info("[jobs] Starting cron jobs...");
  await withTimeout(startCronJobs(), 15_000, "startCronJobs");
  if (env.queue.runWorkers) {
    try {
      const { startWorkers } = await import("@modules/queues/workers");
      startWorkers();
    } catch (err) {
      logger.error("[jobs] Failed to start BullMQ workers — queues disabled", {
        error: (err as Error).message,
      });
    }
  }
  logger.info("[jobs] All schedulers running");
}

// ─────────────────────────────────────────────
// Phase 4 — HTTP Server
// ─────────────────────────────────────────────

import http from "http";

let httpServer: http.Server | null = null;

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(env.port, () => {
      httpServer = server;
      printBanner();
      resolve();
    });
    server.timeout = 600000; // 10 min — SSE uses req.socket.setTimeout(0) to exempt itself
    server.keepAliveTimeout = 65000;

    server.on("error", (err: NodeJS.ErrnoException) => {
      reject(err);
    });
  });
}

// ─────────────────────────────────────────────
// Banner
// ─────────────────────────────────────────────

function printBanner(): void {
  const isProd = env.nodeEnv === "production";

  if (isProd) {
    // Production: clean structured logs, no chalk/decorations
    logger.info("HTTP server listening", { port: env.port });
  } else {
    const envColor = chalk.cyanBright;
    console.log("");
    console.log(chalk.bold.blue("Sadara Engine"));
    console.log(chalk.gray("────────────────────────────────"));
    console.log(
      `${chalk.white("Server:")} ${chalk.blue(`http://localhost:${env.port}`)}`,
    );
    console.log(
      `${chalk.white("Health:")} ${chalk.blue(`http://localhost:${env.port}/api/health`)}`,
    );
    console.log(
      `${chalk.white("Environment:")} ${envColor(env.nodeEnv.toUpperCase())}`,
    );
    console.log(chalk.gray("────────────────────────────────"));
    console.log("");
  }
}

// ─────────────────────────────────────────────
// Entrypoint
// ─────────────────────────────────────────────

/** Exported so the health endpoint can distinguish "starting" from "ready". */
export let appReady = false;
/** Exported so the health endpoint can surface what went wrong. */
export let initError: string | undefined;
/** Exported so the health endpoint skips DB checks during graceful shutdown. */
export let isShuttingDown = false;

async function runInit(): Promise<void> {
  logger.info("[boot] Retrying init sequence...");
  await initInfrastructure();
  await initApplication();
  await startSchedulers();
  appReady = true;
  initError = undefined;
}

async function bootstrap(): Promise<void> {
  // Start HTTP server FIRST so Cloud Run sees the port open quickly
  logger.info("[boot] Starting HTTP server...");
  await startServer();

  // ── Mandatory pre-flight: DB connection ───────────────────────────────────
  // DB connection is still fatal (no point starting an API that can't read
  // its own data). Migrations are NOT run here — CI's pre-deploy step is the
  // single source of truth. See plan: stop-cloudrun-crashloops.
  //
  // 90s timeout: Cloud SQL Auth Proxy sidecar may take up to ~30s to accept
  // connections after container start; with connectTimeout=5s + 5s delay per
  // retry, 90s allows ~6 attempts before giving up.
  logger.info("[boot] Connecting to database...");
  await withTimeout(testConnection(), 90_000, "testConnection");

  // ── Schema-version sanity check (advisory, never fatal) ───────────────────
  // Compares the latest applied migration in `sequelize_meta` to the highest-
  // numbered migration file shipped with this build. A mismatch means CI's
  // migrate step was skipped or partially applied — log loudly so the operator
  // can investigate, but DO NOT crash the container (which would defeat the
  // whole point of decoupling migrations from boot).
  await checkSchemaVersion();
  // ──────────────────────────────────────────────────────────────────────────

  try {
    logger.info("[boot] Phase 1/3 — Infrastructure");
    await initInfrastructure();
    logger.info("[boot] Phase 2/3 — Application");
    await initApplication();
    logger.info("[boot] Phase 3/3 — Schedulers");
    await startSchedulers();
    appReady = true;
    initError = undefined;
    logger.info("[boot] Ready", {
      port: env.port,
      env: env.nodeEnv,
      startupMs: Math.round(performance.now()),
    });
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    const dbErr = (e as any).original?.message;
    initError = dbErr ? `${e.message} — ${dbErr}` : e.message;

    logger.error("[boot] Init failed", { error: initError });

    // In development, crash immediately
    if (env.nodeEnv !== "production") {
      process.exit(1);
    }

    // In production, retry with backoff (DB/Redis may be waking up)
    const delays = [10_000, 30_000];
    for (let i = 0; i < delays.length; i++) {
      const attempt = i + 2;
      logger.info(
        `[boot] Retrying in ${delays[i] / 1000}s (attempt ${attempt}/3)...`,
      );
      await new Promise((r) => setTimeout(r, delays[i]));
      try {
        await runInit();
        logger.info("[boot] Ready (retry succeeded)", {
          attempt,
          startupMs: Math.round(performance.now()),
        });
        return;
      } catch (retryErr: unknown) {
        const re =
          retryErr instanceof Error ? retryErr : new Error(String(retryErr));
        initError = re.message;
        logger.error(`[boot] Retry ${attempt}/3 failed`, {
          error: re.message,
        });
      }
    }

    logger.error("[boot] All retries exhausted — running in degraded mode", {
      degraded: true,
      initError,
      phase: "initApplication",
    });
  }
}

// ─────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────

async function shutdown(): Promise<void> {
  isShuttingDown = true;
  logger.info("[shutdown] Graceful shutdown started...");

  // Close SSE connections FIRST so server.close() doesn't hang waiting for them
  logger.info("[shutdown] Closing SSE subscriber...");
  await closeSSESubscriber();

  if (httpServer) {
    logger.info("[shutdown] Closing HTTP server...");
    await new Promise<void>((res) => httpServer!.close(() => res()));
  }
  logger.info("[shutdown] Closing BullMQ workers and queues...");
  const { stopWorkers } = await import("@modules/queues/workers");
  const { closeAllQueues } = await import("@modules/queues/queues");
  const { closeQueueRedis } = await import("@config/queue");
  await stopWorkers();
  await closeAllQueues();
  await closeQueueRedis();
  logger.info("[shutdown] Closing Redis...");
  await closeRedis();
  logger.info("[shutdown] Closing database...");
  await sequelize.close();
  logger.info("[shutdown] Complete");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled Rejection", {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  if (env.nodeEnv === "production") shutdown();
});

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  process.exit(1);
});

bootstrap().catch((err: unknown) => {
  logger.error("[boot] Fatal unhandled bootstrap error", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
