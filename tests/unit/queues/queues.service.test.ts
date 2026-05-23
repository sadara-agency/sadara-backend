// ── BullMQ mock (must be before imports) ──

const mockQueueInstance = {
  add: jest.fn().mockResolvedValue({ id: "job1" }),
  getJob: jest.fn(),
  obliterate: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => mockQueueInstance),
  Worker: jest.fn().mockImplementation(() => ({ close: jest.fn() })),
}));

jest.mock("@config/queue", () => ({
  getQueueConnection: jest.fn().mockReturnValue({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }),
}));

jest.mock("@config/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { Queue } from "bullmq";
import {
  QueueName,
  getQueue,
  enqueue,
  closeAllQueues,
  getAllQueuesForDashboard,
  DEFAULT_JOB_OPTIONS,
} from "../../../src/modules/queues/queues";

// ═══════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════

describe("QueuesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueInstance.add.mockResolvedValue({ id: "job1" });
    mockQueueInstance.close.mockResolvedValue(undefined);
    // Reset the internal map by clearing all queues between tests
    // We re-import via the module to get a fresh reference
  });

  // ── getQueue ──

  describe("getQueue", () => {
    it("creates a new Queue instance on first call", () => {
      (Queue as unknown as jest.Mock).mockClear();

      const q = getQueue(QueueName.Email);

      expect(Queue).toHaveBeenCalledWith(
        QueueName.Email,
        expect.objectContaining({ connection: expect.any(Object) }),
      );
      expect(q).toBeDefined();
    });

    it("returns same instance on subsequent calls for same name", () => {
      const q1 = getQueue(QueueName.PdfGeneration);
      const q2 = getQueue(QueueName.PdfGeneration);

      expect(q1).toBe(q2);
    });
  });

  // ── enqueue ──

  describe("enqueue", () => {
    it("adds job to queue and returns job id", async () => {
      mockQueueInstance.add.mockResolvedValue({ id: "job-abc" });

      const jobId = await enqueue(QueueName.Email, "send-email", {
        to: "test@example.com",
        subject: "Test",
      });

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        "send-email",
        { to: "test@example.com", subject: "Test" },
        expect.objectContaining({ attempts: DEFAULT_JOB_OPTIONS.attempts }),
      );
      expect(jobId).toBe("job-abc");
    });

    it("merges custom options with defaults", async () => {
      mockQueueInstance.add.mockResolvedValue({ id: "job-custom" });

      await enqueue(
        QueueName.NotificationFanout,
        "send-notification",
        { userId: "u1" },
        { attempts: 1 },
      );

      const addCall = mockQueueInstance.add.mock.calls[0];
      expect(addCall[2].attempts).toBe(1);
    });

    it("propagates errors from queue.add", async () => {
      mockQueueInstance.add.mockRejectedValue(new Error("Redis connection lost"));

      await expect(
        enqueue(QueueName.Email, "send-email", { to: "test@example.com" }),
      ).rejects.toThrow("Redis connection lost");
    });
  });

  // ── closeAllQueues ──

  describe("closeAllQueues", () => {
    it("closes all open queues", async () => {
      // Ensure at least one queue exists
      getQueue(QueueName.Email);

      await closeAllQueues();

      // After close, the internal map is cleared — verify getQueue creates a new one
      (Queue as unknown as jest.Mock).mockClear();
      getQueue(QueueName.Email);
      expect(Queue).toHaveBeenCalled();
    });
  });

  // ── getAllQueuesForDashboard ──

  describe("getAllQueuesForDashboard", () => {
    it("returns array of queue instances", () => {
      getQueue(QueueName.PdfGeneration);
      getQueue(QueueName.SaffFetch);

      const queues = getAllQueuesForDashboard();

      expect(Array.isArray(queues)).toBe(true);
    });
  });

  // ── DEFAULT_JOB_OPTIONS ──

  describe("DEFAULT_JOB_OPTIONS", () => {
    it("has correct retry configuration", () => {
      expect(DEFAULT_JOB_OPTIONS.attempts).toBe(3);
      expect(DEFAULT_JOB_OPTIONS.backoff).toEqual({
        type: "exponential",
        delay: 2000,
      });
    });
  });

  // ── QueueName enum ──

  describe("QueueName enum", () => {
    it("includes all expected queue names", () => {
      expect(QueueName.PdfGeneration).toBe("pdf-generation");
      expect(QueueName.Email).toBe("email");
      expect(QueueName.NotificationFanout).toBe("notification-fanout");
      expect(QueueName.EngineTask).toBe("engine-task");
      expect(QueueName.SaffFetch).toBe("saff-fetch");
      expect(QueueName.ApprovalTaskCreation).toBe("approval-task-creation");
    });
  });
});
