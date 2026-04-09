import { Op, WhereOptions } from "sequelize";
import { Journey } from "./journey.model";
import { EvolutionCycle } from "@modules/evolution-cycles/evolution-cycle.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { Referral } from "@modules/referrals/referral.model";
import { Gate } from "@modules/gates/gate.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateJourneyInput,
  UpdateJourneyInput,
  JourneyQuery,
  ReorderStagesInput,
} from "./journey.validation";
import { sequelize } from "@config/database";

// ── List with filters + pagination ──
export async function listJourneys(query: JourneyQuery) {
  const where: WhereOptions = {};

  if (query.playerId) where.playerId = query.playerId;
  if ((query as any).gateId) where.gateId = (query as any).gateId;
  if (query.status) where.status = query.status;
  if (query.health) where.health = query.health;
  if ((query as any).phase) (where as any).phase = (query as any).phase;
  if ((query as any).evolutionCycleId)
    (where as any).evolutionCycleId = (query as any).evolutionCycleId;
  if (query.assignedTo) where.assignedTo = query.assignedTo;

  const offset = (query.page - 1) * query.limit;
  const { rows: data, count: total } = await Journey.findAndCountAll({
    where,
    order: [
      [query.sort.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), query.order],
    ],
    limit: query.limit,
    offset,
    include: [
      {
        model: Referral,
        as: "referral",
        attributes: ["id", "referralType", "status", "priority"],
        required: false,
      },
      {
        model: Gate,
        as: "gate",
        attributes: ["id", "gateNumber", "status"],
        required: false,
      },
      {
        model: EvolutionCycle,
        as: "evolutionCycle",
        attributes: ["id", "name", "nameAr", "tier", "currentPhase", "status"],
        required: false,
      },
    ],
  });

  // Attach ticket stats per stage
  const stageIds = data.map((s) => s.id);
  if (stageIds.length) {
    const ticketCounts = await Ticket.findAll({
      attributes: [
        "journeyStageId",
        [sequelize.fn("COUNT", sequelize.col("id")), "total"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN status = 'Completed' THEN 1 ELSE 0 END`,
            ),
          ),
          "completed",
        ],
      ],
      where: { journeyStageId: { [Op.in]: stageIds } },
      group: ["journeyStageId"],
      raw: true,
    });

    const statsMap = new Map<string, { total: number; completed: number }>();
    for (const row of ticketCounts as any[]) {
      statsMap.set(row.journeyStageId ?? row.journey_stage_id, {
        total: Number(row.total),
        completed: Number(row.completed),
      });
    }

    for (const stage of data) {
      stage.ticketStats = statsMap.get(stage.id) ?? { total: 0, completed: 0 };
    }
  }

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
export async function getJourneyById(id: string) {
  const stage = await Journey.findByPk(id, {
    include: [
      {
        model: Referral,
        as: "referral",
        attributes: ["id", "referralType", "status", "priority"],
        required: false,
      },
    ],
  });
  if (!stage) throw new AppError("Journey stage not found", 404);

  // Attach tickets for this stage
  const tickets = await Ticket.findAll({
    where: { journeyStageId: id },
    order: [["createdAt", "DESC"]],
  });

  return { ...stage.toJSON(), tickets };
}

// ── Create ──
export async function createJourney(body: CreateJourneyInput, userId: string) {
  // Auto-assign stageOrder if not provided or 0
  if (!body.stageOrder) {
    const maxOrder = await Journey.max<number, Journey>("stageOrder", {
      where: { playerId: body.playerId },
    });
    body.stageOrder = (maxOrder ?? 0) + 1;
  }

  return Journey.create({ ...body, createdBy: userId });
}

// ── Update ──
export async function updateJourney(id: string, body: UpdateJourneyInput) {
  const stage = await Journey.findByPk(id);
  if (!stage) throw new AppError("Journey stage not found", 404);

  // Auto-set dates on status transitions
  if (
    body.status === "InProgress" &&
    stage.status === "NotStarted" &&
    !body.startDate
  ) {
    body.startDate = new Date().toISOString().split("T")[0];
  }
  if (
    body.status === "Completed" &&
    stage.status !== "Completed" &&
    !body.actualEndDate
  ) {
    body.actualEndDate = new Date().toISOString().split("T")[0];
  }

  return stage.update(body);
}

// ── Delete ──
export async function deleteJourney(id: string) {
  const stage = await Journey.findByPk(id);
  if (!stage) throw new AppError("Journey stage not found", 404);
  await stage.destroy();
  return stage;
}

// ── Reorder stages for a player ──
export async function reorderStages(body: ReorderStagesInput) {
  const t = await sequelize.transaction();
  try {
    for (let i = 0; i < body.stageIds.length; i++) {
      await Journey.update(
        { stageOrder: i + 1 },
        {
          where: { id: body.stageIds[i], playerId: body.playerId },
          transaction: t,
        },
      );
    }
    await t.commit();
    return Journey.findAll({
      where: { playerId: body.playerId },
      order: [["stageOrder", "ASC"]],
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// ── Get all stages for a player (used by timeline + kanban) ──
export async function getPlayerJourney(playerId: string) {
  const stages = await Journey.findAll({
    where: { playerId },
    order: [["stageOrder", "ASC"]],
  });

  // Attach ticket stats
  const stageIds = stages.map((s) => s.id);
  if (stageIds.length) {
    const ticketCounts = await Ticket.findAll({
      attributes: [
        "journeyStageId",
        [sequelize.fn("COUNT", sequelize.col("id")), "total"],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN status = 'Completed' THEN 1 ELSE 0 END`,
            ),
          ),
          "completed",
        ],
      ],
      where: { journeyStageId: { [Op.in]: stageIds } },
      group: ["journeyStageId"],
      raw: true,
    });

    const statsMap = new Map<string, { total: number; completed: number }>();
    for (const row of ticketCounts as any[]) {
      statsMap.set(row.journeyStageId ?? row.journey_stage_id, {
        total: Number(row.total),
        completed: Number(row.completed),
      });
    }

    for (const stage of stages) {
      stage.ticketStats = statsMap.get(stage.id) ?? { total: 0, completed: 0 };
    }
  }

  return stages;
}
