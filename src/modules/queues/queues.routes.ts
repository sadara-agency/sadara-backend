import { Router } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { authenticate, authorize } from "@middleware/auth";
import { QueueName, getQueue } from "./queues";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

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

const router = Router();
router.use(authenticate, authorize("Admin"));
router.use("/", serverAdapter.getRouter());

export default router;
