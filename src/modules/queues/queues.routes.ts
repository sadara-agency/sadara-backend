import { Router } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { authenticate, authorize } from "@middleware/auth";
import { logger } from "@config/logger";
import { QueueName, getQueue } from "./queues";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// createBullBoard runs synchronously at module-load time (before uncaughtException
// handler is registered in index.ts). Wrap so any sync failure degrades gracefully
// instead of crashing the process.
try {
  createBullBoard({
    queues: [
      new BullMQAdapter(getQueue(QueueName.PdfGeneration)),
      new BullMQAdapter(getQueue(QueueName.Email)),
      new BullMQAdapter(getQueue(QueueName.NotificationFanout)),
      new BullMQAdapter(getQueue(QueueName.EngineTask)),
      new BullMQAdapter(getQueue(QueueName.SaffFetch)),
    ],
    serverAdapter,
  });
} catch (err) {
  logger.error("[BullBoard] Failed to initialise — dashboard disabled", {
    error: (err as Error).message,
  });
}

const router = Router();
router.use(authenticate, authorize("Admin"));
router.use("/", serverAdapter.getRouter());

export default router;
