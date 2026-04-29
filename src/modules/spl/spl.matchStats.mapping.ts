// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.matchStats.mapping.ts
//
// Pure-function mapper: Pulselive per-player stats array →
// PlayerMatchStats columns. No I/O.
// ─────────────────────────────────────────────────────────────

import type { PlayerMatchStatsAttributes } from "@modules/matches/playerMatchStats.model";
import type { PulseLiveFixtureMatchPlayer } from "@modules/spl/spl.fixtures.types";

/**
 * Convert a Pulselive lineup player entry into the columns we persist
 * in `player_match_stats`. Stats not present default to null/0.
 *
 * Pulselive stat keys we recognize (subset of 155 — match-scoped stats only):
 *   mins_played, goals, goal_assist, total_pass, accurate_pass,
 *   total_tackle, won_tackle, interception_won, aerial_won, aerial_lost,
 *   won_contest, total_contest, fouls, was_fouled, yellow_card, red_card,
 *   saves, clean_sheet, ontarget_scoring_att, total_scoring_att,
 *   big_chance_created, ontarget_att_assist, goals_conceded, penalty_save
 */
export function mapPlayerMatchStats(
  pl: PulseLiveFixtureMatchPlayer,
  ctx: { matchId: string; playerId: string; externalStatsId: string },
): Omit<PlayerMatchStatsAttributes, "id" | "createdAt" | "updatedAt"> {
  const stats = arrayToMap(pl.stats ?? []);

  return {
    matchId: ctx.matchId,
    playerId: ctx.playerId,
    minutesPlayed: num(stats.mins_played),
    goals: num(stats.goals) ?? 0,
    assists: num(stats.goal_assist) ?? 0,
    shotsTotal: num(stats.total_scoring_att),
    shotsOnTarget: num(stats.ontarget_scoring_att),
    passesTotal: num(stats.total_pass),
    passesCompleted: num(stats.accurate_pass),
    tacklesTotal: num(stats.total_tackle),
    interceptions: num(stats.interception_won),
    duelsWon: sumNum(stats.won_tackle, stats.aerial_won, stats.won_contest),
    duelsTotal: sumNum(
      stats.total_tackle,
      stats.aerial_won,
      stats.aerial_lost,
      stats.total_contest,
    ),
    dribblesCompleted: num(stats.won_contest),
    dribblesAttempted: num(stats.total_contest),
    foulsCommitted: num(stats.fouls),
    foulsDrawn: num(stats.was_fouled),
    yellowCards: num(stats.yellow_card) ?? 0,
    redCards: num(stats.red_card) ?? 0,
    rating: null,
    positionInMatch: pl.matchPosition ?? pl.position ?? null,
    keyPasses: num(stats.big_chance_created),
    saves: num(stats.saves),
    cleanSheet:
      typeof stats.clean_sheet === "number" ? stats.clean_sheet > 0 : null,
    goalsConceded: num(stats.goals_conceded),
    penaltiesSaved: num(stats.penalty_save),
    shotMap: [],
    providerSource: "pulselive",
    externalStatsId: ctx.externalStatsId,
  };
}

/** Pulselive lineup `subbedOn`/`subbedOff` → MatchPlayer fields. */
export function mapMatchPlayerAvailability(
  pl: PulseLiveFixtureMatchPlayer,
  isStarter: boolean,
): {
  availability: "starter" | "bench";
  positionInMatch: string | null;
  minutesPlayed: number | null;
} {
  const stats = arrayToMap(pl.stats ?? []);
  const minsPlayed = num(stats.mins_played);

  return {
    availability: isStarter ? "starter" : "bench",
    positionInMatch: pl.matchPosition ?? pl.position ?? null,
    minutesPlayed: minsPlayed,
  };
}

// ── helpers ──

function arrayToMap(
  stats: Array<{ name: string; value: number }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of stats) out[s.name] = s.value;
  return out;
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function sumNum(...vs: unknown[]): number | null {
  let total = 0;
  let any = false;
  for (const v of vs) {
    if (typeof v === "number") {
      total += v;
      any = true;
    }
  }
  return any ? total : null;
}
