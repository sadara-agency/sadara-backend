jest.mock("bullmq", () => ({
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Job: jest.fn(),
}));

jest.mock("@config/queue", () => ({
  getQueueConnection: jest.fn(() => ({})),
}));

jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockGenerate = jest.fn();
jest.mock("@modules/approvals/approvalAutoTasks", () => ({
  generateApprovalRejectedTask: (...args: unknown[]) => mockGenerate(...args),
}));

jest.mock("@shared/utils/audit", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

import { Worker } from "bullmq";
import {
  createApprovalTaskWorker,
  type ApprovalTaskCreationJobData,
} from "./approvalTask.worker";

interface CapturedWorker {
  process: (job: { data: ApprovalTaskCreationJobData }) => Promise<boolean>;
}

function captureProcessor(): CapturedWorker {
  createApprovalTaskWorker();
  const ctorCall = (Worker as unknown as jest.Mock).mock.calls.at(-1);
  if (!ctorCall) throw new Error("Worker was never instantiated");
  const [, processor] = ctorCall;
  return { process: processor };
}

describe("approvalTask.worker", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  it("delegates to generateApprovalRejectedTask with job data", async () => {
    mockGenerate.mockResolvedValueOnce(undefined);
    const { process } = captureProcessor();

    const result = await process({
      data: { approvalId: "appr-1", decision: "Rejected" },
    });

    expect(result).toBe(true);
    expect(mockGenerate).toHaveBeenCalledWith("appr-1", "Rejected");
  });

  it("propagates errors so BullMQ can retry the job", async () => {
    mockGenerate.mockRejectedValueOnce(new Error("DB down"));
    const { process } = captureProcessor();

    await expect(
      process({ data: { approvalId: "appr-2", decision: "Rejected" } }),
    ).rejects.toThrow("DB down");
  });
});
