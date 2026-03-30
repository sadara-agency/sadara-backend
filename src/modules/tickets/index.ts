// Model
export { Ticket } from "./ticket.model";
export type { TicketStatus, TicketPriority, TicketType } from "./ticket.model";

// Service
export * as ticketService from "./ticket.service";

// Routes
export { default as ticketRoutes } from "./ticket.routes";
