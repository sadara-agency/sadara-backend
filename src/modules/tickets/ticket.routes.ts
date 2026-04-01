import { Router } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import { authenticate, authorizeModule } from "@middleware/auth";
import { validate } from "@middleware/validate";
import {
  createTicketSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  ticketQuerySchema,
} from "./ticket.validation";
import * as ticketController from "./ticket.controller";

const router = Router();
router.use(authenticate);

// ── Read ──
router.get(
  "/",
  authorizeModule("tickets", "read"),
  validate(ticketQuerySchema, "query"),
  asyncHandler(ticketController.list),
);

router.get(
  "/:id",
  authorizeModule("tickets", "read"),
  asyncHandler(ticketController.getById),
);

// ── Write ──
router.post(
  "/",
  authorizeModule("tickets", "create"),
  validate(createTicketSchema),
  asyncHandler(ticketController.create),
);

router.patch(
  "/:id",
  authorizeModule("tickets", "update"),
  validate(updateTicketSchema),
  asyncHandler(ticketController.update),
);

router.patch(
  "/:id/status",
  authorizeModule("tickets", "update"),
  validate(updateTicketStatusSchema),
  asyncHandler(ticketController.updateStatus),
);

router.delete(
  "/:id",
  authorizeModule("tickets", "delete"),
  asyncHandler(ticketController.remove),
);

export default router;
