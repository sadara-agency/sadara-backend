import { Op, WhereOptions } from "sequelize";
import { Ticket } from "./ticket.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateTicketInput,
  UpdateTicketInput,
  TicketQuery,
} from "./ticket.validation";

// ── List with filters + pagination ──
export async function listTickets(query: TicketQuery) {
  const where: WhereOptions = {};

  if (query.playerId) where.playerId = query.playerId;
  if (query.journeyStageId) where.journeyStageId = query.journeyStageId;
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.ticketType) where.ticketType = query.ticketType;
  if (query.assignedTo) where.assignedTo = query.assignedTo;
  if (query.search) {
    (where as any)[Op.or] = [
      { title: { [Op.iLike]: `%${query.search}%` } },
      { titleAr: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  // Map sort field from snake_case to camelCase for Sequelize
  const sortField = query.sort.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const offset = (query.page - 1) * query.limit;
  const { rows: data, count: total } = await Ticket.findAndCountAll({
    where,
    order:
      query.sort === "priority"
        ? [
            [
              Ticket.sequelize!.literal(
                `CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END`,
              ),
              query.order,
            ],
          ]
        : [[sortField, query.order]],
    limit: query.limit,
    offset,
  });

  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

// ── Get by ID ──
export async function getTicketById(id: string) {
  const ticket = await Ticket.findByPk(id);
  if (!ticket) throw new AppError("Ticket not found", 404);
  return ticket;
}

// ── Create ──
export async function createTicket(body: CreateTicketInput, userId: string) {
  return Ticket.create({ ...body, createdBy: userId });
}

// ── Update ──
export async function updateTicket(id: string, body: UpdateTicketInput) {
  const ticket = await Ticket.findByPk(id);
  if (!ticket) throw new AppError("Ticket not found", 404);

  // Auto-set completedAt when transitioning to Completed
  if (body.status === "Completed" && ticket.status !== "Completed") {
    (body as any).completedAt = new Date();
    if (!body.closureDate) {
      body.closureDate = new Date().toISOString().split("T")[0];
    }
  }

  // Clear completedAt if reopening
  if (
    body.status &&
    body.status !== "Completed" &&
    ticket.status === "Completed"
  ) {
    (body as any).completedAt = null;
    body.closureDate = null;
  }

  return ticket.update(body);
}

// ── Update Status ──
export async function updateTicketStatus(id: string, status: string) {
  const ticket = await Ticket.findByPk(id);
  if (!ticket) throw new AppError("Ticket not found", 404);

  const updates: Partial<any> = { status };

  if (status === "Completed") {
    updates.completedAt = new Date();
    updates.closureDate = new Date().toISOString().split("T")[0];
  } else if (ticket.status === "Completed") {
    updates.completedAt = null;
    updates.closureDate = null;
  }

  return ticket.update(updates);
}

// ── Delete ──
export async function deleteTicket(id: string) {
  const ticket = await Ticket.findByPk(id);
  if (!ticket) throw new AppError("Ticket not found", 404);
  await ticket.destroy();
  return ticket;
}

// ── Get open tickets count per player (for attention dashboard) ──
export async function getOpenTicketsByPlayer() {
  const results = await Ticket.findAll({
    attributes: [
      "playerId",
      [Ticket.sequelize!.fn("COUNT", Ticket.sequelize!.col("id")), "openCount"],
      [
        Ticket.sequelize!.fn(
          "SUM",
          Ticket.sequelize!.literal(
            `CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END`,
          ),
        ),
        "urgentCount",
      ],
    ],
    where: {
      status: { [Op.notIn]: ["Completed", "Cancelled"] },
    },
    group: ["playerId"],
    raw: true,
  });

  return results as unknown as Array<{
    playerId: string;
    openCount: number;
    urgentCount: number;
  }>;
}
