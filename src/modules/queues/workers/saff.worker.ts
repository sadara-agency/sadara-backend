import { Worker, Job } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { logger } from "@config/logger";
import { QueueName } from "@modules/queues/queues";
import * as saffService from "@modules/saff/saff.service";
import type { FetchRequest } from "@modules/saff/saff.validation";

export type SaffJobKind = "scrape" | "discover";

export interface SaffJobData {
  kind: SaffJobKind;
  fetchRequest?: FetchRequest;
  season?: string;
  triggeredBy?: string;
}

export interface SaffJobResult {
  kind: SaffJobKind;
  standings: number;
  fixtures: number;
  teams: number;
  results: number;
  discovered: number;
  error?: string;
}

export interface SaffJobProgress {
  current: number;
  total: number;
  phase: "scraping" | "writing" | "discovering";
  saffId?: number;
}

async function processJob(
  job: Job<SaffJobData, SaffJobResult>,
): Promise<SaffJobResult> {
  const { kind, fetchRequest, season } = job.data;

  if (kind === "scrape" && fetchRequest) {
    const ids = fetchRequest.tournamentIds;
    let standings = 0,
      fixtures = 0,
      teams = 0,
      results = 0;

    for (let i = 0; i < ids.length; i++) {
      const saffId = ids[i];
      await job.updateProgress({
        current: i + 1,
        total: ids.length,
        phase: "scraping",
        saffId,
      } satisfies SaffJobProgress);

      const partial = await saffService.fetchFromSaff({
        tournamentIds: [saffId],
        season: fetchRequest.season,
        dataTypes: fetchRequest.dataTypes,
      });
      standings += partial.standings;
      fixtures += partial.fixtures;
      teams += partial.teams;
      results += partial.results;
    }

    return { kind, standings, fixtures, teams, results, discovered: 0 };
  }

  if (kind === "discover") {
    const s = season ?? saffService.getCurrentSeason();
    await job.updateProgress({
      current: 0,
      total: 1,
      phase: "discovering",
    } satisfies SaffJobProgress);
    const discovered = await saffService.syncTournamentsFromSaff(s);
    return {
      kind,
      standings: 0,
      fixtures: 0,
      teams: 0,
      results: 0,
      discovered,
    };
  }

  throw new Error(`Unknown SAFF job kind: ${kind}`);
}

export function createSaffWorker(): Worker<SaffJobData, SaffJobResult> {
  const worker = new Worker<SaffJobData, SaffJobResult>(
    QueueName.SaffFetch,
    processJob,
    { connection: getQueueConnection(), concurrency: 1 },
  );

  worker.on("completed", (job, result) =>
    logger.info("[SaffWorker] Job completed", {
      jobId: job.id,
      kind: job.data.kind,
      ...result,
    }),
  );
  worker.on("failed", (job, err) =>
    logger.error("[SaffWorker] Job failed", {
      jobId: job?.id,
      error: err.message,
    }),
  );

  return worker;
}
