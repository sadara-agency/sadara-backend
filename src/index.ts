// src/index.ts

import app from "./app";
import { env } from "@config/env";
import { testConnection, sequelize } from "@config/database";
import { initRedis, closeRedis } from "@config/redis";
import { seedDatabase } from "./database/seed";
import { migrator } from "@config/migrator";
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
  await testConnection();
  await initRedis();
  await initSSESubscriber();
  await migrator.up();
}

// ─────────────────────────────────────────────
// Phase 2 — Application
// ─────────────────────────────────────────────

async function initApplication(): Promise<void> {
  await seedDatabase();
  await loadPermissions();
  await loadTaskRuleConfigFromDB();
  await loadPerformanceTrendConfig();
  await loadInjuryIntelConfig();
  await loadContractLifecycleConfig();
  await loadFinancialIntelConfig();
  await loadGateOnboardingConfig();
  await loadScoutingPipelineConfig();
  await loadTrainingDevConfig();
  await loadSystemHealthConfig();
  await ensureSportmonksColumn();
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

function startSchedulers(): void {
  startSaffScheduler();
  startCronJobs();
}

// ─────────────────────────────────────────────
// Phase 4 — HTTP Server
// ─────────────────────────────────────────────

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    const server = app.listen(env.port, () => {
      printBanner();
      resolve();
    });
    server.timeout = 120000;
    server.keepAliveTimeout = 65000;
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

async function bootstrap(): Promise<void> {
  try {
    await initInfrastructure();
    await initApplication();
    startSchedulers();
    await startServer();
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    logger.error("Failed to start server", {
      error: e.message,
      stack: e.stack,
      ...((e as any).original?.message && {
        dbError: (e as any).original.message,
      }),
    });
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────

async function shutdown(): Promise<void> {
  logger.info("Shutting down...");
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
