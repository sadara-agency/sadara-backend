import { Queue, JobsOptions } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { logger } from "@config/logger";

export enum QueueName {
  PdfGeneration = "pdf-generation",
  Email = "email",
  NotificationFanout = "notification-fanout",
  EngineTask = "engine-task",
  SaffFetch = "saff-fetch",
}

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2_000 },
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 7 * 24 * 3600, count: 1000 },
};

const queues = new Map<QueueName, Queue>();

export function getQueue<T = unknown>(name: QueueName): Queue<T> {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: getQueueConnection() });
    queues.set(name, q);
  }
  return q as Queue<T>;
}

export async function enqueue<T>(
  name: QueueName,
  jobName: string,
  data: T,
  opts?: JobsOptions,
): Promise<string> {
  const q = getQueue<T>(name);
  const job = await (q as any).add(jobName, data, {
    ...DEFAULT_JOB_OPTIONS,
    ...opts,
  });
  logger.info("Job enqueued", { queue: name, jobName, jobId: job.id });
  return job.id!;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(
    Array.from(queues.values()).map((q) => q.close().catch(() => {})),
  );
  queues.clear();
}

export function getAllQueuesForDashboard(): Queue[] {
  return Array.from(queues.values());
}
