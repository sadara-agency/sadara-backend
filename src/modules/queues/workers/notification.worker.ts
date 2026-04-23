import { Worker, Job } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { logger } from "@config/logger";
import { QueueName } from "@modules/queues/queues";
import {
  publishNotification,
  type SSENotificationPayload,
} from "@modules/notifications/notification.sse";

export interface NotificationJobData {
  userId: string;
  payload: SSENotificationPayload;
}

async function processJob(job: Job<NotificationJobData>): Promise<void> {
  const { userId, payload } = job.data;
  await publishNotification(userId, payload);
}

export function createNotificationWorker(): Worker<NotificationJobData, void> {
  const worker = new Worker<NotificationJobData, void>(
    QueueName.NotificationFanout,
    processJob,
    { connection: getQueueConnection(), concurrency: 10 },
  );

  worker.on("failed", (job, err) =>
    logger.warn("[NotificationWorker] Failed", {
      jobId: job?.id,
      error: err,
    }),
  );
  worker.on("error", (err) =>
    logger.error("[NotificationWorker] Worker error", { error: err }),
  );

  return worker;
}
