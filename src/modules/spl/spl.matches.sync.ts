// ─────────────────────────────────────────────────────────────
// src/modules/spl/spl.matches.sync.ts
//
// Persists Pulselive fixtures + fixture-detail responses into the
// existing `matches` and `match_events` tables. Uses
// (provider_source='pulselive', provider_match_id=<plFixtureId>) as
// the upsert key, so re-syncing the same fixture is idempotent.
//
// Companion: spl.fixtures.pulselive.ts (HTTP), spl.matches.sync.ts (this).
// ─────────────────────────────────────────────────────────────

import { Op } from "sequelize";
import { logger } from "@config/logger";
import { Match } from "@modules/matches/match.model";
import {
  MatchEvent,
  type MatchEventType,
} from "@modules/matches/matchEvent.model";
import { Club } from "@modules/clubs/club.model";
import {
  fetchFixtures,
  fetchFixtureDetail,
} from "@modules/spl/spl.fixtures.pulselive";
import type {
  PulseLiveFixture,
  PulseLiveFixtureDetail,
  PulseLiveFixtureEvent,
  PulseLiveFixtureOfficial,
  PulseLiveFixtureStatus,
  PulseLiveFixtureTeamLine,
} from "@modules/spl/spl.fixtures.types";
import { SPL_CLUB_REGISTRY } from "@modules/spl/spl.registry";
import {
  DEFAULT_SEASON_ID,
  YELO_COMP_ID,
  YELO_SEASON_ID,
} from "@modules/spl/spl.pulselive";
import { Competition } from "@modules/competitions/competition.model";

const PROVIDER = "pulselive";

// ── Status mapping ──

function mapStatus(s: PulseLiveFixtureStatus): Match["status"] {
  if (s === "C") return "completed";
  if (s === "L") return "live";
  return "upcoming";
}

// ── Club resolution ──
//
// Pulselive `team.id` ≠ Sadara club; resolve via Club.pulseLiveTeamId
// (Phase C migration adds the column) OR via the SPL_CLUB_REGISTRY
// fallback that already carries `pulseLiveTeamId` for all 18 clubs.

const _registryByPulseLiveId = new Map<number, string>();
for (const entry of SPL_CLUB_REGISTRY) {
  if (entry.pulseLiveTeamId) {
    _registryByPulseLiveId.set(entry.pulseLiveTeamId, entry.splTeamId);
  }
}

let _clubByPulseLiveTeamCache: Map<number, string> | null = null;

async function resolveClubByPulseLiveTeamId(
  pulseLiveTeamId: number,
): Promise<string | null> {
  if (_clubByPulseLiveTeamCache?.has(pulseLiveTeamId)) {
    return _clubByPulseLiveTeamCache.get(pulseLiveTeamId)!;
  }
  if (!_clubByPulseLiveTeamCache) {
    _clubByPulseLiveTeamCache = new Map();
    // Try the new column first; if column doesn't exist yet (Phase A pre-Phase-C),
    // fall back to splTeamId lookup via registry.
    try {
      const rows = (await Club.findAll({
        attributes: ["id", "splTeamId"],
        where: { splTeamId: { [Op.ne]: null } },
        raw: true,
      })) as Array<{ id: string; splTeamId: number | string | null }>;
      // Use the registry to map splTeamId → pulseLiveTeamId
      for (const row of rows) {
        const splIdStr = String(row.splTeamId);
        const reg = SPL_CLUB_REGISTRY.find((r) => r.splTeamId === splIdStr);
        if (reg?.pulseLiveTeamId) {
          _clubByPulseLiveTeamCache.set(reg.pulseLiveTeamId, row.id);
        }
      }
    } catch (err) {
      logger.warn(
        `[SPL fixtures] club cache build failed: ${(err as Error).message}`,
      );
    }
  }
  return _clubByPulseLiveTeamCache.get(pulseLiveTeamId) ?? null;
}

// ── Fixture upsert ──

async function upsertMatchByProvider(
  fx: PulseLiveFixture,
  seasonLabel: string,
  competitionId: string | null = null,
): Promise<{ created: boolean; matchId: string | null; skipReason?: string }> {
  if (!Array.isArray(fx.teams) || fx.teams.length < 2) {
    return { created: false, matchId: null, skipReason: "missing_teams" };
  }

  const [home, away] = fx.teams;
  const homeClubId = await resolveClubByPulseLiveTeamId(home.team.id);
  const awayClubId = await resolveClubByPulseLiveTeamId(away.team.id);

  const matchDate = new Date(fx.kickoff?.millis ?? Date.now());
  const status = mapStatus(fx.status);
  const venue = fx.ground?.name ?? null;
  const externalMatchId = `pulselive:${competitionId ?? "unknown"}:${fx.id}`;

  const where = {
    providerSource: PROVIDER,
    providerMatchId: String(fx.id),
  };

  const existing = await Match.findOne({ where });
  if (existing) {
    const update: Partial<Match["_attributes"]> = {
      matchDate,
      status,
      venue,
      homeClubId,
      awayClubId,
      homeTeamName: home.team.name ?? home.team.shortName ?? null,
      awayTeamName: away.team.name ?? away.team.shortName ?? null,
      homeScore: typeof home.score === "number" ? home.score : null,
      awayScore: typeof away.score === "number" ? away.score : null,
      season: seasonLabel,
      attendance: fx.attendance ?? null,
      externalMatchId,
      ...(competitionId && !existing.competitionId ? { competitionId } : {}),
    };
    // Don't clobber a manually-set referee with null
    await existing.update(update);
    return { created: false, matchId: existing.id };
  }

  const created = await Match.create({
    matchDate,
    status,
    venue,
    homeClubId,
    awayClubId,
    homeTeamName: home.team.name ?? home.team.shortName ?? null,
    awayTeamName: away.team.name ?? away.team.shortName ?? null,
    homeScore: typeof home.score === "number" ? home.score : null,
    awayScore: typeof away.score === "number" ? away.score : null,
    season: seasonLabel,
    providerSource: PROVIDER,
    providerMatchId: String(fx.id),
    externalMatchId,
    competitionId,
    attendance: fx.attendance ?? null,
  });
  return { created: true, matchId: created.id };
}

// ── Event mapping ──

function mapEventType(raw: string): MatchEventType | null {
  const t = raw.toUpperCase();
  if (t === "G" || t === "GOAL") return "goal";
  if (t === "OG" || t === "OWN_GOAL") return "own_goal";
  if (t === "PG" || t === "PENALTY_GOAL") return "penalty_goal";
  if (t === "PM" || t === "PENALTY_MISS") return "penalty_miss";
  if (t === "Y" || t === "YELLOW") return "yellow";
  if (t === "YR" || t === "SECOND_YELLOW") return "second_yellow";
  if (t === "R" || t === "RED") return "red";
  if (t === "S" || t === "SUB" || t === "SUBSTITUTION") return "sub_in";
  if (t === "A" || t === "ASSIST") return "assist";
  if (t === "VAR" || t === "VAR_REVIEW") return "var_review";
  if (t === "I" || t === "INJURY") return "injury";
  if (t === "K" || t === "KICKOFF") return "kickoff";
  if (t === "HT" || t === "HALFTIME") return "halftime";
  if (t === "FT" || t === "FULLTIME") return "fulltime";
  return null;
}

function eventMinute(ev: PulseLiveFixtureEvent): number {
  const secs = ev.time?.secs ?? ev.clock?.secs;
  if (typeof secs === "number") return Math.floor(secs / 60);
  // Some payloads use a label like "45'+2"
  const label = ev.time?.label ?? ev.clock?.label ?? "";
  const m = /^(\d+)/.exec(label);
  return m ? Number(m[1]) : 0;
}

function eventStoppage(ev: PulseLiveFixtureEvent): number | null {
  const label = ev.time?.label ?? ev.clock?.label ?? "";
  const m = /\+(\d+)/.exec(label);
  return m ? Number(m[1]) : null;
}

function teamSideForEvent(
  ev: PulseLiveFixtureEvent,
  teams: PulseLiveFixtureTeamLine[],
): "home" | "away" {
  if (typeof ev.teamId !== "number" || teams.length < 2) return "home";
  return ev.teamId === teams[0].team.id ? "home" : "away";
}

// ── Officials → referee string ──

function pickReferee(
  officials: PulseLiveFixtureOfficial[] | undefined,
): string | null {
  if (!Array.isArray(officials)) return null;
  const ref = officials.find(
    (o) =>
      (o.role ?? "").toUpperCase().includes("MAIN") ||
      (o.role ?? "").toUpperCase() === "REFEREE",
  );
  if (!ref?.name) return null;
  const display =
    ref.name.display ?? `${ref.name.first ?? ""} ${ref.name.last ?? ""}`.trim();
  return display || null;
}

// ── Public service ──

export async function syncFixtures(
  seasonId?: number,
  opts: {
    statuses?: PulseLiveFixtureStatus[];
    pulseLiveTeamId?: number;
    compId?: number;
    competitionId?: string | null;
  } = {},
): Promise<{
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}> {
  const fixtures = await fetchFixtures(seasonId, opts);
  const seasonLabel = seasonId ? String(seasonId) : String(DEFAULT_SEASON_ID);
  const competitionId = opts.competitionId ?? null;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const fx of fixtures) {
    try {
      const r = await upsertMatchByProvider(fx, seasonLabel, competitionId);
      if (r.skipReason) skipped++;
      else if (r.created) created++;
      else updated++;
    } catch (err) {
      errors++;
      logger.warn(
        `[SPL fixtures] upsert failed for fixture ${fx.id}: ${(err as Error).message}`,
      );
    }
  }

  logger.info(
    `[SPL fixtures] sync done — fetched=${fixtures.length} created=${created} updated=${updated} skipped=${skipped} errors=${errors}`,
  );
  return {
    fetched: fixtures.length,
    created,
    updated,
    skipped,
    errors,
  };
}

/**
 * Engine-callable sync for a single competition served by PulseLive.
 * Reads `pulseLiveCompId` from the Competition row to determine which
 * comp/season to fetch. Returns the same shape as saffplus syncCompetitionMatches().
 */
export async function syncSplCompetition(
  competitionId: string,
  _season: string,
): Promise<{
  upserted: number;
  skipped: number;
  unmapped: number;
  errors: string[];
}> {
  const competition = await Competition.findByPk(competitionId, {
    attributes: ["id", "name", "pulseLiveCompId"],
  });

  if (!competition?.pulseLiveCompId) {
    return {
      upserted: 0,
      skipped: 0,
      unmapped: 0,
      errors: [`Competition ${competitionId} has no pulseLiveCompId set`],
    };
  }

  const compId = competition.pulseLiveCompId;
  // Use YELO_SEASON_ID for Yelo (comp 219); DEFAULT_SEASON_ID for Roshn (comp 72)
  const seasonId = compId === YELO_COMP_ID ? YELO_SEASON_ID : undefined;

  logger.info(
    `[SPL] syncSplCompetition: ${competition.name} (pulseLiveCompId=${compId}, season=${seasonId ?? DEFAULT_SEASON_ID})`,
  );

  const result = await syncFixtures(seasonId, {
    compId,
    competitionId,
  });

  return {
    upserted: result.created + result.updated,
    skipped: result.skipped,
    unmapped: 0,
    errors:
      result.errors > 0
        ? [`${result.errors} fixture(s) failed — check logs`]
        : [],
  };
}

export async function syncFixtureDetail(pulselivefixtureId: number): Promise<{
  matchId: string | null;
  eventsUpserted: number;
  refereeSet: boolean;
  reason?: string;
}> {
  const detail = await fetchFixtureDetail(pulselivefixtureId);
  if (!detail) {
    return {
      matchId: null,
      eventsUpserted: 0,
      refereeSet: false,
      reason: "not_found",
    };
  }

  // Ensure the parent Match row exists. Use the same upsert path so we
  // don't depend on a prior syncFixtures call.
  const seasonLabel = String(DEFAULT_SEASON_ID);
  const upsert = await upsertMatchByProvider(detail, seasonLabel);
  if (!upsert.matchId) {
    return {
      matchId: null,
      eventsUpserted: 0,
      refereeSet: false,
      reason: upsert.skipReason ?? "match_upsert_failed",
    };
  }

  const match = await Match.findByPk(upsert.matchId);
  if (!match) {
    return {
      matchId: null,
      eventsUpserted: 0,
      refereeSet: false,
      reason: "match_disappeared",
    };
  }

  // Half-time score (Pulselive carries it on each team line)
  const homeHt = detail.teams?.[0]?.htScore ?? null;
  const awayHt = detail.teams?.[1]?.htScore ?? null;
  const referee = pickReferee(detail.officials ?? detail.matchOfficials);

  const updates: Partial<Match["_attributes"]> = {};
  if (referee && !match.referee) updates.referee = referee;
  if (homeHt !== null && awayHt !== null && match.notes == null) {
    // Stash HT score in notes as "HT 1-1" — we don't have a dedicated column.
    updates.notes = `HT ${homeHt}-${awayHt}`;
  }
  if (Object.keys(updates).length > 0) {
    await match.update(updates);
  }

  // Events — accept multiple field names; Pulselive payload shape varies.
  const allEvents: PulseLiveFixtureEvent[] = [
    ...(detail.events ?? []),
    ...(detail.goals ?? []),
    ...(detail.cards ?? []),
    ...(detail.substitutions ?? []),
  ];

  let eventsUpserted = 0;
  for (const ev of allEvents) {
    const type = mapEventType(ev.type ?? ev.rawType ?? "");
    if (!type) continue;
    const minute = eventMinute(ev);
    const stoppageMinute = eventStoppage(ev);
    const teamSide = teamSideForEvent(ev, detail.teams);
    const externalEventId = ev.id != null ? `${detail.id}:${ev.id}` : null;

    const where: Record<string, unknown> = {
      matchId: match.id,
      providerSource: PROVIDER,
    };
    if (externalEventId) where.externalEventId = externalEventId;
    else {
      where.minute = minute;
      where.type = type;
      where.teamSide = teamSide;
    }

    const existing = await MatchEvent.findOne({ where });
    if (existing) {
      await existing.update({
        minute,
        stoppageMinute,
        type,
        teamSide,
        rawPayload: ev as unknown as Record<string, unknown>,
      });
    } else {
      await MatchEvent.create({
        matchId: match.id,
        minute,
        stoppageMinute,
        type,
        teamSide,
        playerId: null,
        relatedPlayerId: null,
        descriptionAr: null,
        descriptionEn: ev.description ?? null,
        externalEventId,
        providerSource: PROVIDER,
        rawPayload: ev as unknown as Record<string, unknown>,
      });
    }
    eventsUpserted++;
  }

  logger.info(
    `[SPL fixtures] detail sync ${pulselivefixtureId}: ${eventsUpserted} events, referee=${referee ? "yes" : "no"}`,
  );
  return {
    matchId: match.id,
    eventsUpserted,
    refereeSet: Boolean(referee && updates.referee),
  };
}

export async function syncAllFixtureDetails(
  seasonId?: number,
  sinceDate?: string,
): Promise<{ fixtures: number; events: number; errors: number }> {
  // Pull the list of completed/live fixtures, then loop their details.
  const fixtures = await fetchFixtures(seasonId, { statuses: ["C", "L"] });
  const since = sinceDate ? new Date(sinceDate).getTime() : null;
  let events = 0;
  let errors = 0;

  for (const fx of fixtures) {
    if (since && fx.kickoff?.millis < since) continue;
    try {
      const r = await syncFixtureDetail(fx.id);
      events += r.eventsUpserted;
    } catch (err) {
      errors++;
      logger.warn(
        `[SPL fixtures] detail sync failed for ${fx.id}: ${(err as Error).message}`,
      );
    }
  }

  return { fixtures: fixtures.length, events, errors };
}

/** Reset internal caches — exposed for tests + admin endpoints. */
export function resetCaches(): void {
  _clubByPulseLiveTeamCache = null;
}
