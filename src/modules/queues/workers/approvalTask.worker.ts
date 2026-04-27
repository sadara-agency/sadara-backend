import { Worker, Job } from "bullmq";
import { getQueueConnection } from "@config/queue";
import { logger } from "@config/logger";
import { QueueName } from "@modules/queues/queues";
import { generateApprovalRejectedTask } from "@modules/approvals/approvalAutoTasks";
import { logAudit } from "@shared/utils/audit";

export interface ApprovalTaskCreationJobData {
  approvalId: string;
  decision: "Approved" | "Rejected";
}

const SYSTEM_CTX = {
  userId: "system",
  userName: "System",
  userRole: "Admin" as const,
};

async function processJob(
  job: Job<ApprovalTaskCreationJobData>,
): Promise<boolean> {
  const { approvalId, decision } = job.data;
  await generateApprovalRejectedTask(approvalId, decision);
  return true;
}

export function createApprovalTaskWorker(): Worker<
  ApprovalTaskCreationJobData,
  boolean
> {
  const worker = new Worker<ApprovalTaskCreationJobData, boolean>(
    QueueName.ApprovalTaskCreation,
    processJob,
    { connection: getQueueConnection(), concurrency: 5 },
  );

  worker.on("completed", (job) =>
    logger.info("[ApprovalTaskWorker] Created", {
      jobId: job.id,
      approvalId: job.data.approvalId,
    }),
  );

  worker.on("failed", (job, err) => {
    const finalAttempt =
      job?.attemptsMade !== undefined &&
      job?.opts?.attempts !== undefined &&
      job.attemptsMade >= job.opts.attempts;
    logger.error("[ApprovalTaskWorker] Failed", {
      jobId: job?.id,
      approvalId: job?.data.approvalId,
      attempt: job?.attemptsMade,
      finalAttempt,
      error: err.message,
    });
    // Surface terminal failures into the audit trail so ops can triage.
    if (finalAttempt && job?.data.approvalId) {
      logAudit(
        "ERROR",
        "approvals",
        job.data.approvalId,
        SYSTEM_CTX,
        `Approval rejection auto-task creation exhausted retries: ${err.message}`,
      ).catch(() => {});
    }
  });

  worker.on("error", (err) =>
    logger.error("[ApprovalTaskWorker] Worker error", { error: err }),
  );

  return worker;
}
