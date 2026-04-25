import fs from "fs";
import { Worker, Job } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { QueueName } from "@modules/queues/queues";
import { logger } from "@config/logger";
import { generateReportPdf } from "@modules/reports/report.pdf";
import { regenerateSignedPdf } from "@modules/contracts/contract.signing.service";
import { Contract } from "@modules/contracts/contract.model";

export type PdfJobKind = "report" | "contract-regen";

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

  if (kind === "report") {
    const { reportId, player, data } = input as {
      reportId: string;
      player: unknown;
      data: unknown;
    };
    const filePath = await generateReportPdf(
      reportId,
      player as any,
      data as any,
    );
    const pageCount = 3; // profile + matchList + injury pages (+ brand pages from mergeWithBrandPages)
    const sizeBytes = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    // TODO INFRA-001 follow-up: upload `filePath` to GCS via @google-cloud/storage
    const gcsKey = `reports/${requestedBy}/${job.id}.pdf`;
    return { pageCount, sizeBytes, gcsKey, url: "" };
  }

  if (kind === "contract-regen") {
    const { contractId } = input as { contractId: string };
    const fileUrl = await regenerateSignedPdf(contractId);
    await Contract.update(
      { documentUrl: fileUrl },
      { where: { id: contractId } },
    );
    return { pageCount: 1, sizeBytes: 0, gcsKey: fileUrl, url: fileUrl };
  }

  throw new Error(`Unsupported PDF kind: ${kind}`);
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
