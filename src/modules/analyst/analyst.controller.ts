import type { Response } from "express";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import * as service from "./analyst.service";
import * as writes from "./analyst.writes";
import type { z } from "zod";
import type {
  matchStatsQuerySchema,
  kpiTrendQuerySchema,
  compareQuerySchema,
  createKpiSchema,
  updateKpiSchema,
  computeKpiSchema,
  upsertSeasonStatsSchema,
  createSessionSchema,
  updateSessionSchema,
  createEvolutionCycleSchema,
  updateEvolutionCycleSchema,
} from "./analyst.validation";
import type {
  AdvancePhaseInput,
  CreateEvolutionCycleInput,
  UpdateEvolutionCycleInput,
} from "@modules/evolution-cycles/evolution-cycle.validation";
import type {
  CreateSessionInput,
  UpdateSessionInput,
} from "@modules/sessions/session.validation";

// ── Read handlers ─────────────────────────────────────────────────────────────

export async function listPlayers(req: AuthRequest, res: Response) {
  const data = await service.listAssignedPlayers(req.user!);
  sendSuccess(res, data);
}

export async function getProfile(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const data = await service.getPlayerProfile(playerId, req.user!);
  sendSuccess(res, data);
}

export async function getMatchStats(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const query = req.query as unknown as z.infer<typeof matchStatsQuerySchema>;
  const result = await service.getRecentMatchStats(
    playerId,
    req.user!,
    query.page,
    query.limit,
  );
  const totalPages = Math.ceil(result.total / query.limit);
  sendPaginated(res, result.data, {
    page: query.page,
    limit: query.limit,
    total: result.total,
    totalPages,
  });
}

export async function getSeasonStats(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const { getAllPlayerSeasonStats } =
    await import("@modules/playerStats/playerStats.service");
  const assigned = await service.listAssignedPlayers(req.user!);
  if (!assigned.find((p) => p.id === playerId)) {
    res
      .status(403)
      .json({ success: false, message: "Player not assigned to you" });
    return;
  }
  const data = await getAllPlayerSeasonStats(playerId);
  sendSuccess(res, data);
}

export async function getKpiTrend(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const { lastN } = req.query as unknown as z.infer<typeof kpiTrendQuerySchema>;
  const assigned = await service.listAssignedPlayers(req.user!);
  if (!assigned.find((p) => p.id === playerId)) {
    res
      .status(403)
      .json({ success: false, message: "Player not assigned to you" });
    return;
  }
  const { getPlayerTacticalTrend } =
    await import("@modules/tactical/kpis/tacticalKpi.service");
  const data = await getPlayerTacticalTrend(playerId, lastN);
  sendSuccess(res, data);
}

export async function compare(req: AuthRequest, res: Response) {
  const { playerIds, season } = req.query as unknown as z.infer<
    typeof compareQuerySchema
  >;
  const data = await service.comparePlayers(playerIds, req.user!, season);
  sendSuccess(res, data);
}

// ── KPI write handlers ────────────────────────────────────────────────────────

export async function createKpi(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const body = req.body as z.infer<typeof createKpiSchema>;
  const data = await writes.analystCreateKpi(playerId, body, req.user!);
  res.status(201).json({ success: true, data });
}

export async function updateKpi(req: AuthRequest, res: Response) {
  const { kpiId } = req.params;
  const body = req.body as z.infer<typeof updateKpiSchema>;
  const data = await writes.analystUpdateKpi(kpiId, body);
  sendSuccess(res, data);
}

export async function computeKpi(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const { matchId } = req.body as z.infer<typeof computeKpiSchema>;
  const data = await writes.analystComputeKpi(playerId, matchId, req.user!);
  sendSuccess(res, data);
}

// ── Season stats write handlers ───────────────────────────────────────────────

export async function upsertSeasonStats(req: AuthRequest, res: Response) {
  const { playerId, season } = req.params;
  const body = req.body as z.infer<typeof upsertSeasonStatsSchema>;
  const data = await writes.analystUpsertSeasonStats(
    playerId,
    season,
    body,
    req.user!,
  );
  sendSuccess(res, data);
}

export async function recomputeSeasonStats(req: AuthRequest, res: Response) {
  const { playerId, season } = req.params;
  const data = await writes.analystRecomputeSeasonStats(
    playerId,
    season,
    req.user!,
  );
  sendSuccess(res, data);
}

// ── Session write handlers ────────────────────────────────────────────────────

export async function createSession(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const body = req.body as Omit<CreateSessionInput, "playerId">;
  const data = await writes.analystCreateSession(playerId, body, req.user!);
  res.status(201).json({ success: true, data });
}

export async function updateSession(req: AuthRequest, res: Response) {
  const { sessionId } = req.params;
  const body = req.body as UpdateSessionInput;
  const data = await writes.analystUpdateSession(sessionId, body);
  sendSuccess(res, data);
}

// ── Evolution cycle write handlers ────────────────────────────────────────────

export async function createEvolutionCycle(req: AuthRequest, res: Response) {
  const { playerId } = req.params;
  const body = req.body as Omit<CreateEvolutionCycleInput, "playerId">;
  const data = await writes.analystCreateEvolutionCycle(
    playerId,
    body,
    req.user!,
  );
  res.status(201).json({ success: true, data });
}

export async function updateEvolutionCycle(req: AuthRequest, res: Response) {
  const { cycleId } = req.params;
  const body = req.body as UpdateEvolutionCycleInput;
  const data = await writes.analystUpdateEvolutionCycle(cycleId, body);
  sendSuccess(res, data);
}

export async function advanceEvolutionPhase(req: AuthRequest, res: Response) {
  const { cycleId } = req.params;
  const body = req.body as AdvancePhaseInput;
  const data = await writes.analystAdvanceEvolutionPhase(cycleId, body);
  sendSuccess(res, data);
}
