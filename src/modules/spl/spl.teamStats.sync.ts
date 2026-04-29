// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.teamStats.sync.ts
//
// Phase C — persists Pulselive team-aggregate stats (196 metrics)
// per (club, comp_season) into team_season_stats.
// ─────────────────────────────────────────────────────────────

import { logger } from "@config/logger";
import { Op } from "sequelize";
import { Club } from "@modules/clubs/club.model";
import { TeamSeasonStats } from "@modules/spl/spl.teamSeasonStats.model";
import { fetchTeamStats, DEFAULT_SEASON_ID } from "@modules/spl/spl.pulselive";
import { SPL_CLUB_REGISTRY } from "@modules/spl/spl.registry";

async function resolveClubId(pulseLiveTeamId: number): Promise<string | null> {
  const direct = (await Club.findOne({
    where: { pulseLiveTeamId },
    attributes: ["id"],
    raw: true,
  })) as { id: string } | null;
  if (direct) return direct.id;
  const reg = SPL_CLUB_REGISTRY.find(
    (r) => r.pulseLiveTeamId === pulseLiveTeamId,
  );
  if (!reg) return null;
  const club = (await Club.findOne({
    where: {
      splTeamId: {
        [Op.in]: [Number(reg.splTeamId), reg.splTeamId as unknown as number],
      },
    },
    attributes: ["id"],
    raw: true,
  })) as { id: string } | null;
  return club?.id ?? null;
}

export async function syncTeamSeasonStats(
  pulseLiveTeamId: number,
  seasonId?: number,
): Promise<{
  clubId: string | null;
  rowId: string | null;
  metrics: number;
  reason?: string;
}> {
  const compSeasonId = seasonId ?? DEFAULT_SEASON_ID;
  const seasonLabel = String(compSeasonId);

  const clubId = await resolveClubId(pulseLiveTeamId);
  if (!clubId) {
    return { clubId: null, rowId: null, metrics: 0, reason: "club_not_found" };
  }

  const fetched = await fetchTeamStats(pulseLiveTeamId, compSeasonId);
  if (!fetched) {
    return { clubId, rowId: null, metrics: 0, reason: "no_stats" };
  }

  const where = { clubId, compSeasonId };
  const existing = await TeamSeasonStats.findOne({ where });
  if (existing) {
    await existing.update({
      pulseLiveTeamId,
      seasonLabel,
      stats: fetched.stats,
      providerSource: "pulselive",
      lastSyncedAt: new Date(),
    });
    return {
      clubId,
      rowId: existing.id,
      metrics: Object.keys(fetched.stats).length,
    };
  }
  const row = await TeamSeasonStats.create({
    clubId,
    pulseLiveTeamId,
    compSeasonId,
    seasonLabel,
    stats: fetched.stats,
  });
  return {
    clubId,
    rowId: row.id,
    metrics: Object.keys(fetched.stats).length,
  };
}

export async function syncAllTeamSeasonStats(seasonId?: number): Promise<{
  teams: number;
  upserted: number;
  errors: number;
}> {
  let teams = 0;
  let upserted = 0;
  let errors = 0;

  for (const reg of SPL_CLUB_REGISTRY) {
    if (!reg.pulseLiveTeamId) continue;
    teams++;
    try {
      const r = await syncTeamSeasonStats(reg.pulseLiveTeamId, seasonId);
      if (r.rowId) upserted++;
    } catch (err) {
      errors++;
      logger.warn(
        `[SPL teamStats] failed team=${reg.pulseLiveTeamId}: ${(err as Error).message}`,
      );
    }
  }

  return { teams, upserted, errors };
}
