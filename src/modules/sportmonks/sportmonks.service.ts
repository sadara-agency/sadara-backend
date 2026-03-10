/**
 * Sportmonks Service — Business logic for fixture import and team mapping
 */

import { Op } from "sequelize";
import { sequelize } from "../../config/database";
import { Match } from "../matches/match.model";
import { Club } from "../clubs/club.model";
import {
  Competition,
  ClubCompetition,
} from "../competitions/competition.model";
import * as provider from "./sportmonks.provider";
import {
  SM_STATE_MAP,
  type SmFixture,
  type NormalizedFixture,
  type ImportResult,
} from "./sportmonks.types";

// ── Column migration ──

export async function ensureSportmonksColumn(): Promise<void> {
  try {
    await sequelize.query(
      `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sportmonks_team_id INTEGER UNIQUE`,
    );
  } catch {
    // Column may already exist — safe to ignore
  }
}

// ── Normalize fixtures ──

async function getTeamMappingLookup(): Promise<Map<number, string>> {
  const clubs = await Club.findAll({
    where: { sportmonksTeamId: { [Op.ne]: null } },
    attributes: ["id", "sportmonksTeamId"],
  });
  const map = new Map<number, string>();
  for (const c of clubs) {
    if (c.sportmonksTeamId != null) map.set(c.sportmonksTeamId, c.id);
  }
  return map;
}

async function getImportedFixtureIds(): Promise<Set<string>> {
  const matches = await Match.findAll({
    where: { providerSource: "Sportmonks", externalMatchId: { [Op.ne]: null } },
    attributes: ["externalMatchId"],
  });
  return new Set(matches.map((m) => m.externalMatchId!));
}

function normalizeFixture(
  f: SmFixture,
  teamMap: Map<number, string>,
  importedIds: Set<string>,
): NormalizedFixture {
  const home = f.participants?.find((p) => p.meta.location === "home");
  const away = f.participants?.find((p) => p.meta.location === "away");

  // Find FT or CURRENT score
  const ftScore = f.scores?.filter((s) => s.description === "CURRENT") ?? [];
  const homeScore = home
    ? (ftScore.find((s) => s.participant_id === home.id)?.score?.goals ?? null)
    : null;
  const awayScore = away
    ? (ftScore.find((s) => s.participant_id === away.id)?.score?.goals ?? null)
    : null;

  const startingAt = f.starting_at ? new Date(f.starting_at) : new Date();

  return {
    id: f.id,
    date: startingAt.toISOString().split("T")[0],
    time: startingAt.toTimeString().slice(0, 5),
    homeTeamId: home?.id ?? 0,
    homeTeam: home?.name ?? "TBD",
    homeShortCode: home?.short_code ?? "",
    homeLogo: home?.image_path ?? "",
    awayTeamId: away?.id ?? 0,
    awayTeam: away?.name ?? "TBD",
    awayShortCode: away?.short_code ?? "",
    awayLogo: away?.image_path ?? "",
    homeScore,
    awayScore,
    status: SM_STATE_MAP[f.state_id] ?? "upcoming",
    competition: f.league?.name ?? "",
    season: f.season?.name ?? "",
    venue: f.venue?.name ?? "",
    city: f.venue?.city_name ?? "",
    homeClubId: home ? (teamMap.get(home.id) ?? null) : null,
    awayClubId: away ? (teamMap.get(away.id) ?? null) : null,
    isImported: importedIds.has(String(f.id)),
  };
}

// ── Public API ──

export async function fetchFixtures(
  from: string,
  to: string,
  leagueId?: number,
): Promise<NormalizedFixture[]> {
  const raw = await provider.fetchFixtures(from, to, leagueId);
  const teamMap = await getTeamMappingLookup();
  const importedIds = await getImportedFixtureIds();
  return raw.map((f) => normalizeFixture(f, teamMap, importedIds));
}

export async function fetchLeagues() {
  return provider.fetchLeagues();
}

export async function searchTeams(query: string) {
  return provider.searchTeams(query);
}

export async function testConnection() {
  return provider.testConnection();
}

// ── Team mapping ──

export async function getTeamMappings() {
  const clubs = await Club.findAll({
    where: { sportmonksTeamId: { [Op.ne]: null } },
    attributes: ["id", "name", "nameAr", "logoUrl", "sportmonksTeamId"],
    order: [["name", "ASC"]],
  });
  return clubs.map((c) => ({
    clubId: c.id,
    clubName: c.name,
    clubNameAr: c.nameAr,
    clubLogo: c.logoUrl,
    sportmonksTeamId: c.sportmonksTeamId,
  }));
}

export async function mapTeam(
  sportmonksTeamId: number,
  clubId: string,
): Promise<void> {
  // Clear any existing mapping for this sportmonks team
  await Club.update(
    { sportmonksTeamId: null },
    { where: { sportmonksTeamId } },
  );
  // Set the mapping
  await Club.update({ sportmonksTeamId }, { where: { id: clubId } });
}

export async function unmapTeam(clubId: string): Promise<void> {
  await Club.update({ sportmonksTeamId: null }, { where: { id: clubId } });
}

// ── Resolve competition by Sportmonks league ID ──

async function resolveCompetitionId(
  smLeagueId: number | undefined,
  leagueName: string,
): Promise<string | null> {
  if (smLeagueId) {
    const byId = await Competition.findOne({
      where: { sportmonksLeagueId: smLeagueId },
      attributes: ["id"],
    });
    if (byId) return byId.id;
  }
  if (leagueName) {
    const byName = await Competition.findOne({
      where: { name: { [Op.iLike]: `%${leagueName}%` } },
      attributes: ["id"],
    });
    if (byName) return byName.id;
  }
  return null;
}

// ── Auto-create club_competitions entry ──

async function ensureClubCompetition(
  clubId: string | null,
  competitionId: string | null,
  season: string | null,
  transaction: any,
) {
  if (!clubId || !competitionId || !season) return;
  await ClubCompetition.findOrCreate({
    where: { clubId, competitionId, season },
    defaults: { clubId, competitionId, season },
    transaction,
  });
}

// ── Sync Sportmonks leagues → competitions table ──

export async function syncLeagues(): Promise<number> {
  const leagues = await provider.fetchLeagues();
  let synced = 0;
  for (const league of leagues) {
    const [, created] = await Competition.findOrCreate({
      where: { sportmonksLeagueId: league.id },
      defaults: {
        name: league.name,
        sportmonksLeagueId: league.id,
        type: "league" as const,
        tier: 1,
        gender: "men" as const,
        format: "outdoor" as const,
        agencyValue: "Medium" as const,
        country: "Saudi Arabia",
        isActive: league.active ?? true,
      },
    });
    if (created) synced++;
  }
  return synced;
}

// ── Import fixtures to core matches ──

export async function importFixtures(
  fixtureIds: number[],
  from: string,
  to: string,
  leagueId?: number,
): Promise<ImportResult> {
  // Fetch raw fixtures from API (need full data for import)
  const raw = await provider.fetchFixtures(from, to, leagueId);
  const teamMap = await getTeamMappingLookup();
  const idSet = new Set(fixtureIds);

  const toImport = raw.filter((f) => idSet.has(f.id));
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    details: [],
  };

  // Cache competition lookups per league ID
  const competitionCache = new Map<string, string | null>();

  const t = await sequelize.transaction();

  try {
    for (const f of toImport) {
      const home = f.participants?.find((p) => p.meta.location === "home");
      const away = f.participants?.find((p) => p.meta.location === "away");
      const homeClubId = home ? (teamMap.get(home.id) ?? null) : null;
      const awayClubId = away ? (teamMap.get(away.id) ?? null) : null;

      const ftScore =
        f.scores?.filter((s) => s.description === "CURRENT") ?? [];
      const homeScore = home
        ? (ftScore.find((s) => s.participant_id === home.id)?.score?.goals ??
          null)
        : null;
      const awayScore = away
        ? (ftScore.find((s) => s.participant_id === away.id)?.score?.goals ??
          null)
        : null;

      const status = SM_STATE_MAP[f.state_id] ?? "upcoming";
      const matchDate = f.starting_at ? new Date(f.starting_at) : new Date();

      // Resolve competition_id
      const leagueKey = `${f.league_id ?? ""}-${f.league?.name ?? ""}`;
      if (!competitionCache.has(leagueKey)) {
        competitionCache.set(
          leagueKey,
          await resolveCompetitionId(f.league_id, f.league?.name ?? ""),
        );
      }
      const competitionId = competitionCache.get(leagueKey) ?? null;
      const seasonName = f.season?.name ?? null;

      // Check for existing match
      const existing = await Match.findOne({
        where: { externalMatchId: String(f.id), providerSource: "Sportmonks" },
        transaction: t,
      });

      if (existing) {
        // Update score/status if changed
        const updates: any = {};
        if (homeScore != null && existing.homeScore !== homeScore)
          updates.homeScore = homeScore;
        if (awayScore != null && existing.awayScore !== awayScore)
          updates.awayScore = awayScore;
        if (existing.status !== status) updates.status = status;
        if (competitionId && !existing.competitionId)
          updates.competitionId = competitionId;

        if (Object.keys(updates).length > 0) {
          await existing.update(updates, { transaction: t });
          result.updated++;
          result.details.push({
            fixtureId: f.id,
            matchId: existing.id,
            action: "updated",
          });
        } else {
          result.skipped++;
          result.details.push({
            fixtureId: f.id,
            matchId: existing.id,
            action: "skipped",
          });
        }
      } else {
        const match = await Match.create(
          {
            matchDate,
            homeClubId,
            awayClubId,
            homeTeamName: home?.name ?? null,
            awayTeamName: away?.name ?? null,
            competitionId,
            competition: f.league?.name ?? "",
            season: seasonName,
            venue: f.venue?.name ?? null,
            homeScore,
            awayScore,
            status: status as any,
            providerSource: "Sportmonks",
            externalMatchId: String(f.id),
          } as any,
          { transaction: t },
        );
        result.imported++;
        result.details.push({
          fixtureId: f.id,
          matchId: match.id,
          action: "created",
        });
      }

      // Auto-create club_competitions entries
      await ensureClubCompetition(homeClubId, competitionId, seasonName, t);
      await ensureClubCompetition(awayClubId, competitionId, seasonName, t);
    }

    await t.commit();
    return result;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
