import { z } from "zod";

// ── Shared constants ──
const TICKET_STATUSES = [
  "Open",
  "InProgress",
  "WaitingOnPlayer",
  "Completed",
  "Cancelled",
] as const;

const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const TICKET_TYPES = [
  "Physical",
  "Technical",
  "Tactical",
  "Medical",
  "Mental",
  "Administrative",
  "General",
] as const;

// ── Create Ticket ──
export const createTicketSchema = z.object({
  playerId: z.string().uuid("Invalid player ID"),
  journeyStageId: z.string().uuid("Invalid journey stage ID").optional(),
  title: z.string().min(1, "Title is required"),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  ticketType: z.enum(TICKET_TYPES).default("General"),
  priority: z.enum(TICKET_PRIORITIES).default("medium"),
  assignedTo: z.string().uuid("Invalid user ID").optional(),
  receivingParty: z.string().optional(),
  receivingPartyAr: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
});

// ── Update Ticket ──
export const updateTicketSchema = z.object({
  journeyStageId: z
    .string()
    .uuid("Invalid journey stage ID")
    .nullable()
    .optional(),
  title: z.string().min(1).optional(),
  titleAr: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  ticketType: z.enum(TICKET_TYPES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  assignedTo: z.string().uuid("Invalid user ID").nullable().optional(),
  receivingParty: z.string().nullable().optional(),
  receivingPartyAr: z.string().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  closureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  notesAr: z.string().nullable().optional(),
});

// ── Update Status ──
export const updateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES, {
    errorMap: () => ({
      message:
        "Status must be Open, InProgress, WaitingOnPlayer, Completed, or Cancelled",
    }),
  }),
});

// ── Query ──
export const ticketQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(20),
  sort: z
    .enum([
      "created_at",
      "updated_at",
      "due_date",
      "priority",
      "status",
      "ticket_type",
    ])
    .default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  playerId: z.string().uuid().optional(),
  journeyStageId: z.string().uuid().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  ticketType: z.enum(TICKET_TYPES).optional(),
  assignedTo: z.string().uuid().optional(),
});

// ── Inferred types ──
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type TicketQuery = z.infer<typeof ticketQuerySchema>;
