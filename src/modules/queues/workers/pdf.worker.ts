import fs from "fs";
import { Worker, Job } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { QueueName } from "@modules/queues/queues";
import { logger } from "@config/logger";
import { generateReportPdf } from "@modules/reports/report.pdf";

export type PdfJobKind = "report"; // extend in INFRA-002 with 'scouting' | 'contract' | 'mediaKit'

export interface PdfJobData {
  kind: PdfJobKind;
  input: Record<string, unknown>;
  requestedBy: string;
}

export interface PdfJobResult {
  pageCount: number;
  sizeBytes: number;
  gcsKey: string;
  url: string;
}

async function processJob(job: Job<PdfJobData>): Promise<PdfJobResult> {
  const { kind, input, requestedBy } = job.data;
  logger.info("PDF job started", { jobId: job.id, kind, requestedBy });

  let filePath: string;
  let pageCount: number;

  if (kind === "report") {
    const { reportId, player, data } = input as {
      reportId: string;
      player: unknown;
      data: unknown;
    };
    filePath = await generateReportPdf(reportId, player as any, data as any);
    pageCount = 3; // profile + matchList + injury pages (+ brand pages from mergeWithBrandPages)
  } else {
    throw new Error(`Unsupported PDF kind: ${kind}`);
  }

  const sizeBytes = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

  // TODO INFRA-001 follow-up: upload `filePath` to GCS via @google-cloud/storage
  // (see media uploader for the existing upload pattern). Return real gcsKey + url.
  const gcsKey = `reports/${requestedBy}/${job.id}.pdf`;
  const url = ""; // populated after GCS upload is wired in

  return { pageCount, sizeBytes, gcsKey, url };
}

export function createPdfWorker(): Worker<PdfJobData, PdfJobResult> {
  const worker = new Worker<PdfJobData, PdfJobResult>(
    QueueName.PdfGeneration,
    processJob,
    { connection: getQueueConnection(), concurrency: 2 },
  );
  worker.on("completed", (job) =>
    logger.info("PDF job completed", { jobId: job.id }),
  );
  worker.on("failed", (job, err) =>
    logger.error("PDF job failed", { jobId: job?.id, error: err }),
  );
  worker.on("error", (err) =>
    logger.error("[PdfWorker] Worker error", { error: err }),
  );
  return worker;
}
