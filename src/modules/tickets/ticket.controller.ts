import { Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as ticketService from "./ticket.service";

// ── List ──
export async function list(req: AuthRequest, res: Response) {
  const result = await ticketService.listTickets(req.query as any);
  sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const ticket = await ticketService.getTicketById(req.params.id);
  sendSuccess(res, ticket);
}

// ── Create ──
export async function create(req: AuthRequest, res: Response) {
  const ticket = await ticketService.createTicket(req.body, req.user!.id);

  await logAudit(
    "CREATE",
    "tickets",
    ticket.id,
    buildAuditContext(req.user!, req.ip),
    `Ticket created: ${ticket.title}`,
  );

  sendCreated(res, ticket, "Ticket created");
}

// ── Update ──
export async function update(req: AuthRequest, res: Response) {
  const ticket = await ticketService.updateTicket(req.params.id, req.body);

  await logAudit(
    "UPDATE",
    "tickets",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Ticket updated: ${ticket.title}`,
  );

  sendSuccess(res, ticket, "Ticket updated");
}

// ── Update Status ──
export async function updateStatus(req: AuthRequest, res: Response) {
  const ticket = await ticketService.updateTicketStatus(
    req.params.id,
    req.body.status,
  );

  await logAudit(
    "UPDATE",
    "tickets",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Ticket status changed to: ${req.body.status}`,
  );

  sendSuccess(res, ticket, "Ticket status updated");
}

// ── Delete ──
export async function remove(req: AuthRequest, res: Response) {
  const ticket = await ticketService.deleteTicket(req.params.id);

  await logAudit(
    "DELETE",
    "tickets",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Ticket deleted: ${ticket.title}`,
  );

  sendSuccess(res, null, "Ticket deleted");
}
