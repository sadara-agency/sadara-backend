import { Worker, Job } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { logger } from "@config/logger";
import { QueueName } from "@modules/queues/queues";
import { runJob } from "@cron/scheduler";

export interface EngineJobData {
  jobName: string;
}

async function processJob(job: Job<EngineJobData>): Promise<void> {
  const { jobName } = job.data;
  logger.info("[EngineWorker] Processing", { jobId: job.id, jobName });
  const result = await runJob(jobName);
  if (!result) {
    logger.warn("[EngineWorker] Unknown engine job", { jobName });
  }
}

export function createEngineWorker(): Worker<EngineJobData, void> {
  const worker = new Worker<EngineJobData, void>(
    QueueName.EngineTask,
    processJob,
    { connection: getQueueConnection(), concurrency: 2 },
  );

  worker.on("completed", (job) =>
    logger.info("[EngineWorker] Completed", {
      jobId: job.id,
      jobName: job.data.jobName,
    }),
  );
  worker.on("failed", (job, err) =>
    logger.error("[EngineWorker] Failed", {
      jobId: job?.id,
      jobName: job?.data.jobName,
      error: err.message,
    }),
  );
  worker.on("error", (err) =>
    logger.error("[EngineWorker] Worker error", { error: err.message }),
  );

  return worker;
}
