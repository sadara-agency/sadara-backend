import { getAssignedPlayerIds } from "@shared/utils/rowScope";
import { AppError } from "@middleware/errorHandler";
import type { AuthUser } from "@shared/types";
import {
  createTacticalKpi,
  updateTacticalKpi,
  computeTacticalKpis,
} from "@modules/tactical/kpis/tacticalKpi.service";
import {
  recomputeFromMatches,
  upsertPlayerSeasonStats,
} from "@modules/playerStats/playerStats.service";
import {
  createSession,
  updateSession,
} from "@modules/sessions/session.service";
import {
  createEvolutionCycle,
  updateEvolutionCycle,
  advancePhase,
} from "@modules/evolution-cycles/evolution-cycle.service";
import type {
  CreateTacticalKpiInput,
  UpdateTacticalKpiInput,
} from "@modules/tactical/kpis/tacticalKpi.validation";
import type {
  CreateSessionInput,
  UpdateSessionInput,
} from "@modules/sessions/session.validation";
import type {
  CreateEvolutionCycleInput,
  UpdateEvolutionCycleInput,
  AdvancePhaseInput,
} from "@modules/evolution-cycles/evolution-cycle.validation";
import type { z } from "zod";
import type { upsertSeasonStatsSchema } from "./analyst.validation";

async function assertAssigned(playerId: string, user: AuthUser): Promise<void> {
  const ids = await getAssignedPlayerIds(user);
  if (!ids.includes(playerId)) {
    throw new AppError("Player not assigned to you", 403);
  }
}

export async function analystCreateKpi(
  playerId: string,
  body: Omit<CreateTacticalKpiInput, "playerId">,
  user: AuthUser,
) {
  await assertAssigned(playerId, user);
  return createTacticalKpi({ ...body, playerId }, user.id);
}

export async function analystUpdateKpi(
  kpiId: string,
  body: UpdateTacticalKpiInput,
) {
  return updateTacticalKpi(kpiId, body);
}

export async function analystComputeKpi(
  playerId: string,
  matchId: string,
  user: AuthUser,
) {
  await assertAssigned(playerId, user);
  return computeTacticalKpis(playerId, matchId, user.id);
}

export async function analystUpsertSeasonStats(
  playerId: string,
  season: string,
  body: z.infer<typeof upsertSeasonStatsSchema>,
  user: AuthUser,
) {
  await assertAssigned(playerId, user);
  return upsertPlayerSeasonStats(playerId, season, body);
}

export async function analystRecomputeSeasonStats(
  playerId: string,
  season: string,
  user: AuthUser,
) {
  await assertAssigned(playerId, user);
  return recomputeFromMatches(playerId, season);
}

export async function analystCreateSession(
  playerId: string,
  body: Omit<CreateSessionInput, "playerId">,
  user: AuthUser,
) {
  await assertAssigned(playerId, user);
  // programOwner is auto-set by SESSION_ROLE_CONFIG in createSession() when user is passed
  return createSession(
    { ...body, playerId } as CreateSessionInput,
    user.id,
    user,
  );
}

export async function analystUpdateSession(
  sessionId: string,
  body: UpdateSessionInput,
) {
  return updateSession(sessionId, body);
}

export async function analystCreateEvolutionCycle(
  playerId: string,
  body: Omit<CreateEvolutionCycleInput, "playerId">,
  user: AuthUser,
) {
  await assertAssigned(playerId, user);
  return createEvolutionCycle(
    { ...body, playerId } as CreateEvolutionCycleInput,
    user.id,
  );
}

export async function analystUpdateEvolutionCycle(
  cycleId: string,
  body: UpdateEvolutionCycleInput,
) {
  return updateEvolutionCycle(cycleId, body);
}

export async function analystAdvanceEvolutionPhase(
  cycleId: string,
  body: AdvancePhaseInput,
) {
  return advancePhase(cycleId, body);
}
