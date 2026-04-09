import { Op, WhereOptions } from "sequelize";
import { EvolutionCycle } from "./evolution-cycle.model";
import { Journey } from "@modules/journey/journey.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateEvolutionCycleInput,
  UpdateEvolutionCycleInput,
  EvolutionCycleQuery,
  AdvancePhaseInput,
} from "./evolution-cycle.validation";
import type { EvolutionPhase } from "./evolution-cycle.model";

const PHASE_ORDER: EvolutionPhase[] = [
  "Diagnostic",
  "Foundation",
  "Integration",
  "Mastery",
];

// ── List with filters + pagination ──
export async function listEvolutionCycles(query: EvolutionCycleQuery) {
  const where: WhereOptions = {};

  if (query.playerId) where.playerId = query.playerId;
  if (query.status) where.status = query.status;
  if (query.tier) where.tier = query.tier;
  if (query.currentPhase) where.currentPhase = query.currentPhase;

  const offset = (query.page - 1) * query.limit;
  const { rows: data, count: total } = await EvolutionCycle.findAndCountAll({
    where,
    order: [
      [
        query.sort.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        query.order,
      ],
    ],
    limit: query.limit,
    offset,
  });

  // Attach phase stats for each cycle
  if (data.length) {
    const cycleIds = data.map((c) => c.id);
    const stages = await Journey.findAll({
      attributes: ["evolutionCycleId", "phase", "status"],
      where: { evolutionCycleId: { [Op.in]: cycleIds } },
      raw: true,
    });

    const statsMap = new Map<
      string,
      Record<string, { total: number; completed: number }>
    >();
    for (const stage of stages as any[]) {
      const cycleId = stage.evolutionCycleId ?? stage.evolution_cycle_id;
      const phase = stage.phase ?? "Diagnostic";
      if (!statsMap.has(cycleId)) statsMap.set(cycleId, {});
      const phaseMap = statsMap.get(cycleId)!;
      if (!phaseMap[phase]) phaseMap[phase] = { total: 0, completed: 0 };
      phaseMap[phase].total++;
      if (stage.status === "Completed") phaseMap[phase].completed++;
    }

    for (const cycle of data) {
      cycle.phaseStats = {
        Diagnostic: { total: 0, completed: 0 },
        Foundation: { total: 0, completed: 0 },
        Integration: { total: 0, completed: 0 },
        Mastery: { total: 0, completed: 0 },
        ...statsMap.get(cycle.id),
      };
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
export async function getEvolutionCycleById(id: string) {
  const cycle = await EvolutionCycle.findByPk(id);
  if (!cycle) throw new AppError("Evolution cycle not found", 404);

  // Attach stages grouped by phase
  const stages = await Journey.findAll({
    where: { evolutionCycleId: id },
    order: [["stageOrder", "ASC"]],
  });

  const phaseStats: Record<string, { total: number; completed: number }> = {
    Diagnostic: { total: 0, completed: 0 },
    Foundation: { total: 0, completed: 0 },
    Integration: { total: 0, completed: 0 },
    Mastery: { total: 0, completed: 0 },
  };

  for (const stage of stages) {
    const phase = (stage as any).phase ?? "Diagnostic";
    if (phaseStats[phase]) {
      phaseStats[phase].total++;
      if (stage.status === "Completed") phaseStats[phase].completed++;
    }
  }

  return { ...cycle.toJSON(), stages, phaseStats };
}

// ── Get all cycles for a player ──
export async function getPlayerEvolutionCycles(playerId: string) {
  const cycles = await EvolutionCycle.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
  });

  // Attach stage counts per phase for each cycle
  if (cycles.length) {
    const cycleIds = cycles.map((c) => c.id);
    const stages = await Journey.findAll({
      attributes: ["evolutionCycleId", "phase", "status"],
      where: { evolutionCycleId: { [Op.in]: cycleIds } },
      raw: true,
    });

    const statsMap = new Map<
      string,
      Record<string, { total: number; completed: number }>
    >();
    for (const stage of stages as any[]) {
      const cycleId = stage.evolutionCycleId ?? stage.evolution_cycle_id;
      const phase = stage.phase ?? "Diagnostic";
      if (!statsMap.has(cycleId)) statsMap.set(cycleId, {});
      const phaseMap = statsMap.get(cycleId)!;
      if (!phaseMap[phase]) phaseMap[phase] = { total: 0, completed: 0 };
      phaseMap[phase].total++;
      if (stage.status === "Completed") phaseMap[phase].completed++;
    }

    for (const cycle of cycles) {
      cycle.phaseStats = {
        Diagnostic: { total: 0, completed: 0 },
        Foundation: { total: 0, completed: 0 },
        Integration: { total: 0, completed: 0 },
        Mastery: { total: 0, completed: 0 },
        ...statsMap.get(cycle.id),
      };
    }
  }

  return cycles;
}

// ── Create ──
export async function createEvolutionCycle(
  body: CreateEvolutionCycleInput,
  userId: string,
) {
  return EvolutionCycle.create({ ...body, createdBy: userId });
}

// ── Update ──
export async function updateEvolutionCycle(
  id: string,
  body: UpdateEvolutionCycleInput,
) {
  const cycle = await EvolutionCycle.findByPk(id);
  if (!cycle) throw new AppError("Evolution cycle not found", 404);

  // Auto-set dates on status transitions
  if (
    body.status === "Active" &&
    cycle.status !== "Active" &&
    !body.startDate
  ) {
    body.startDate = new Date().toISOString().split("T")[0];
  }
  if (body.status === "Completed" && cycle.status !== "Completed") {
    if (!body.actualEndDate) {
      body.actualEndDate = new Date().toISOString().split("T")[0];
    }
  }

  return cycle.update(body);
}

// ── Advance Phase ──
export async function advancePhase(id: string, body: AdvancePhaseInput) {
  const cycle = await EvolutionCycle.findByPk(id);
  if (!cycle) throw new AppError("Evolution cycle not found", 404);

  const currentIdx = PHASE_ORDER.indexOf(cycle.currentPhase);
  const nextIdx = PHASE_ORDER.indexOf(body.nextPhase);

  if (nextIdx <= currentIdx) {
    throw new AppError(
      `Cannot move from ${cycle.currentPhase} to ${body.nextPhase}. Phases must advance forward.`,
      400,
    );
  }

  // Auto-update tier based on phase advancement
  let newTier = cycle.tier;
  if (body.nextPhase === "Foundation") newTier = "DevelopingPerformer";
  else if (body.nextPhase === "Integration") newTier = "MatchReadyPro";
  else if (body.nextPhase === "Mastery") newTier = "PeakPerformer";

  return cycle.update({
    currentPhase: body.nextPhase,
    tier: newTier,
  });
}

// ── Delete ──
export async function deleteEvolutionCycle(id: string) {
  const cycle = await EvolutionCycle.findByPk(id);
  if (!cycle) throw new AppError("Evolution cycle not found", 404);

  // Unlink stages (set their evolution_cycle_id to null)
  await Journey.update({ evolutionCycleId: null } as any, {
    where: { evolutionCycleId: id } as any,
  });

  await cycle.destroy();
  return cycle;
}
