// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.backfill.service.ts
//
// Phase D — historical-season backfill orchestrator. Iterates
// every comp-season available in Pulselive (~2011/12 onward) and
// invokes the Phase A/B/C sync functions for each season.
//
// Long-running. Records progress in `spl_backfill_runs` so a
// crash/restart can resume from the last completed season instead
// of restarting from scratch.
// ─────────────────────────────────────────────────────────────

import { logger } from "@config/logger";
import { fetchCompSeasons } from "@modules/spl/spl.seasons.pulselive";
import type { PulseLiveCompSeason } from "@modules/spl/spl.seasons.pulselive";
import {
  syncFixtures,
  syncAllFixtureDetails,
} from "@modules/spl/spl.matches.sync";
import { syncAllMatchPlayerStats } from "@modules/spl/spl.matchStats.sync";
import { syncAllTeamRosters } from "@modules/spl/spl.rosters.sync";
import { syncAllTeamSeasonStats } from "@modules/spl/spl.teamStats.sync";
import { SplBackfillRun } from "@modules/spl/spl.backfillRun.model";

export interface BackfillScope {
  fixtures?: boolean;
  fixtureDetails?: boolean;
  matchStats?: boolean;
  rosters?: boolean;
  teamStats?: boolean;
}

export interface BackfillSummary {
  seasonId: number;
  seasonLabel: string;
  fixtures?: { fetched: number; created: number; updated: number };
  fixtureDetails?: { fixtures: number; events: number };
  matchStats?: { fixtures: number; statsRows: number; unmappedTotal: number };
  rosters?: { teams: number; members: number; unmappedTotal: number };
  teamStats?: { teams: number; upserted: number };
  errors: string[];
}

export async function listAvailableSeasons(
  compId?: number,
): Promise<{ id: number; label: string; isCurrent: boolean }[]> {
  const raw = await fetchCompSeasons(compId);
  return raw.map((s: PulseLiveCompSeason) => ({
    id: s.id,
    label: s.label,
    isCurrent: Boolean(s.current),
  }));
}

export async function backfillSeason(
  seasonId: number,
  scope: BackfillScope,
): Promise<BackfillSummary> {
  const errors: string[] = [];
  const summary: BackfillSummary = {
    seasonId,
    seasonLabel: String(seasonId),
    errors,
  };

  const run = await SplBackfillRun.create({
    seasonId,
    scope: scope as unknown as Record<string, unknown>,
    status: "running",
    startedAt: new Date(),
    summary: {},
  });

  try {
    if (scope.fixtures) {
      const r = await syncFixtures(seasonId);
      summary.fixtures = {
        fetched: r.fetched,
        created: r.created,
        updated: r.updated,
      };
    }
    if (scope.fixtureDetails) {
      const r = await syncAllFixtureDetails(seasonId);
      summary.fixtureDetails = { fixtures: r.fixtures, events: r.events };
    }
    if (scope.matchStats) {
      const r = await syncAllMatchPlayerStats(seasonId);
      summary.matchStats = {
        fixtures: r.fixtures,
        statsRows: r.statsRows,
        unmappedTotal: r.unmappedTotal,
      };
    }
    if (scope.rosters) {
      const r = await syncAllTeamRosters(seasonId);
      summary.rosters = {
        teams: r.teams,
        members: r.members,
        unmappedTotal: r.unmappedTotal,
      };
    }
    if (scope.teamStats) {
      const r = await syncAllTeamSeasonStats(seasonId);
      summary.teamStats = { teams: r.teams, upserted: r.upserted };
    }

    await run.update({
      status: "completed",
      finishedAt: new Date(),
      summary: summary as unknown as Record<string, unknown>,
    });
  } catch (err) {
    errors.push((err as Error).message);
    await run.update({
      status: "failed",
      finishedAt: new Date(),
      summary: summary as unknown as Record<string, unknown>,
    });
    logger.error(
      `[SPL backfill] season ${seasonId} failed: ${(err as Error).message}`,
    );
  }

  return summary;
}

export async function backfillAllHistoricalSeasons(
  scope: BackfillScope,
  opts: { fromYear?: number } = {},
): Promise<BackfillSummary[]> {
  const seasons = await listAvailableSeasons();
  const filtered = opts.fromYear
    ? seasons.filter((s) => {
        // Labels look like "2025/26" — parse first 4 digits
        const year = Number(s.label.slice(0, 4));
        return Number.isFinite(year) && year >= opts.fromYear!;
      })
    : seasons;

  const out: BackfillSummary[] = [];
  for (const s of filtered) {
    const summary = await backfillSeason(s.id, scope);
    summary.seasonLabel = s.label;
    out.push(summary);
  }
  return out;
}
