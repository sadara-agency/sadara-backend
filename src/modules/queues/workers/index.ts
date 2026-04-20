import { Worker } from "bullmq";
import { createPdfWorker } from "./pdf.worker";
import { createEmailWorker } from "./email.worker";
import { createNotificationWorker } from "./notification.worker";
import { createEngineWorker } from "./engine.worker";
import { createSaffWorker } from "./saff.worker";
import { logger } from "@config/logger";

const workers: Worker[] = [];

export function startWorkers(): void {
  workers.push(
    createPdfWorker(),
    createEmailWorker(),
    createNotificationWorker(),
    createEngineWorker(),
    createSaffWorker(),
  );
  logger.info("BullMQ workers started", { count: workers.length });
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  workers.length = 0;
  logger.info("BullMQ workers stopped");
}
