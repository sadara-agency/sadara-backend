// src/index.ts

import app from "./app";
import { env } from "@config/env";
import { testConnection, sequelize } from "@config/database";
import { initRedis, closeRedis } from "@config/redis";
import { seedDatabase } from "./database/seed";
import { migrator, setMigrationTimeouts } from "@config/migrator";
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
// Phase 1 — Infrastructure
// ─────────────────────────────────────────────

async function initInfrastructure(): Promise<void> {
  await withTimeout(testConnection(), 30_000, "testConnection");
  await withTimeout(initRedis(), 15_000, "initRedis");
  await withTimeout(initSSESubscriber(), 10_000, "initSSESubscriber");

  // Create core tables from Sequelize models before migrations run.
  // We sync models individually to avoid Sequelize's buggy cyclic-reference
  // ALTER TABLE codepath (User ↔ Player cycle generates invalid SQL).
  const MODEL_SYNC_TIMEOUT = 15_000;
  const models = Object.values(sequelize.models);
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
  // Second pass: retry models that failed due to FK ordering
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

  // Register associations AFTER tables exist so FK constraints are valid
  setupAssociations();

  // Set lock/statement timeouts so migrations fail fast instead of hanging
  await setMigrationTimeouts();
  await withTimeout(migrator.up(), 180_000, "migrator.up");

  // Reset to defaults so normal app queries aren't constrained
  await sequelize.query("RESET lock_timeout");
  await sequelize.query("RESET statement_timeout");
}

// ─────────────────────────────────────────────
// Phase 2 — Application
// ─────────────────────────────────────────────

async function initApplication(): Promise<void> {
  const CFG_TIMEOUT = 15_000;
  await withTimeout(seedDatabase(), 120_000, "seedDatabase");
  await withTimeout(loadPermissions(), CFG_TIMEOUT, "loadPermissions");
  await withTimeout(
    loadTaskRuleConfigFromDB(),
    CFG_TIMEOUT,
    "loadTaskRuleConfig",
  );
  await withTimeout(
    loadPerformanceTrendConfig(),
    CFG_TIMEOUT,
    "loadPerformanceTrendConfig",
  );
  await withTimeout(
    loadInjuryIntelConfig(),
    CFG_TIMEOUT,
    "loadInjuryIntelConfig",
  );
  await withTimeout(
    loadContractLifecycleConfig(),
    CFG_TIMEOUT,
    "loadContractLifecycleConfig",
  );
  await withTimeout(
    loadFinancialIntelConfig(),
    CFG_TIMEOUT,
    "loadFinancialIntelConfig",
  );
  await withTimeout(
    loadGateOnboardingConfig(),
    CFG_TIMEOUT,
    "loadGateOnboardingConfig",
  );
  await withTimeout(
    loadScoutingPipelineConfig(),
    CFG_TIMEOUT,
    "loadScoutingPipelineConfig",
  );
  await withTimeout(
    loadTrainingDevConfig(),
    CFG_TIMEOUT,
    "loadTrainingDevConfig",
  );
  await withTimeout(
    loadSystemHealthConfig(),
    CFG_TIMEOUT,
    "loadSystemHealthConfig",
  );
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
  startSaffScheduler();
  await withTimeout(startCronJobs(), 15_000, "startCronJobs");
}

// ─────────────────────────────────────────────
// Phase 4 — HTTP Server
// ─────────────────────────────────────────────

import http from "http";
import { execSync } from "child_process";

let httpServer: http.Server | null = null;

/** Kill whatever is holding `port` (Windows-only helper). */
function killPortHolder(port: number): boolean {
  try {
    const out = execSync(
      `netstat -ano | findstr ":${port}" | findstr "LISTEN"`,
      {
        encoding: "utf8",
      },
    );
    const pids = new Set(
      out
        .split("\n")
        .map((l) => l.trim().split(/\s+/).pop())
        .filter((p): p is string => !!p && /^\d+$/.test(p)),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        logger.warn(`Killed stale process ${pid} on port ${port}`);
      } catch {
        /* already gone */
      }
    }
    return pids.size > 0;
  } catch {
    return false;
  }
}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = app.listen(env.port, () => {
      httpServer = server;
      printBanner();
      resolve();
    });
    server.timeout = 120000;
    server.keepAliveTimeout = 65000;

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.warn(
          `Port ${env.port} in use — killing stale process and retrying…`,
        );
        if (killPortHolder(env.port)) {
          setTimeout(() => {
            server.listen(env.port);
          }, 1000);
        } else {
          reject(err);
        }
      } else {
        reject(err);
      }
    });
  });
}

// ─────────────────────────────────────────────
// Banner
// ─────────────────────────────────────────────

function printBanner(): void {
  const isProd = env.nodeEnv === "production";
  const envColor = isProd ? chalk.redBright : chalk.cyanBright;

  console.log("");
  console.log(chalk.bold.blue("🚀 Sadara Engine"));
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

  console.log(
    chalk.gray(`[${new Date().toLocaleTimeString()}] Sadara is ready.`),
  );

  console.log(chalk.gray("────────────────────────────────"));
  console.log("");
}

// ─────────────────────────────────────────────
// Entrypoint
// ─────────────────────────────────────────────

/** Exported so the health endpoint can distinguish "starting" from "ready". */
export let appReady = false;
/** Exported so the health endpoint can surface what went wrong. */
export let initError: string | undefined;

async function bootstrap(): Promise<void> {
  try {
    // Start HTTP server FIRST so Cloud Run sees the port open quickly
    await startServer();

    // Then run heavy initialization
    await initInfrastructure();
    await initApplication();
    await startSchedulers();

    appReady = true;
    initError = undefined;
    logger.info("All initialization complete — app is ready");
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    const dbErr = (e as any).original?.message;
    initError = dbErr ? `${e.message} — ${dbErr}` : e.message;

    logger.error("Failed to initialize", {
      error: e.message,
      stack: e.stack,
      ...(dbErr && { dbError: dbErr }),
    });

    // In production, keep the server alive so the health endpoint can report
    // the error instead of crash-looping. Cloud Run will see ready=false.
    if (env.nodeEnv !== "production") {
      process.exit(1);
    }

    // Retry initialization after a delay (DB may be waking up)
    logger.info("Will retry initialization in 10 seconds…");
    setTimeout(() => {
      retryInit();
    }, 10_000);
  }
}

async function retryInit(): Promise<void> {
  logger.info("Retrying initialization…");
  try {
    await initInfrastructure();
    await initApplication();
    await startSchedulers();

    appReady = true;
    initError = undefined;
    logger.info("Retry succeeded — app is ready");
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    initError = e.message;
    logger.error("Retry failed", { error: e.message });

    // Try once more after 30s then give up
    setTimeout(() => {
      retryInit2();
    }, 30_000);
  }
}

async function retryInit2(): Promise<void> {
  logger.info("Final initialization retry…");
  try {
    await initInfrastructure();
    await initApplication();
    await startSchedulers();

    appReady = true;
    initError = undefined;
    logger.info("Final retry succeeded — app is ready");
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    initError = e.message;
    logger.error("All retries exhausted — app staying in degraded state", {
      error: e.message,
    });
  }
}

// ─────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────

async function shutdown(): Promise<void> {
  logger.info("Shutting down...");
  if (httpServer) {
    await new Promise<void>((res) => httpServer!.close(() => res()));
  }
  await closeSSESubscriber();
  await closeRedis();
  await sequelize.close();
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

bootstrap();
