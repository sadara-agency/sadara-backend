import { Worker, Job } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { logger } from "@config/logger";
import { QueueName } from "@modules/queues/queues";
import { sendMailDirect } from "@shared/utils/mail";

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function processJob(job: Job<EmailJobData>): Promise<boolean> {
  return sendMailDirect(job.data);
}

export function createEmailWorker(): Worker<EmailJobData, boolean> {
  const worker = new Worker<EmailJobData, boolean>(
    QueueName.Email,
    processJob,
    { connection: getQueueConnection(), concurrency: 5 },
  );

  worker.on("completed", (job) =>
    logger.info("[EmailWorker] Sent", { jobId: job.id, to: job.data.to }),
  );
  worker.on("failed", (job, err) =>
    logger.error("[EmailWorker] Failed", {
      jobId: job?.id,
      error: err,
    }),
  );
  worker.on("error", (err) =>
    logger.error("[EmailWorker] Worker error", { error: err }),
  );

  return worker;
}
