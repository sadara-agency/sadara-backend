/**
 * Saudi Leagues Service
 *
 * Read-side aggregation for the /dashboard/saudi-leagues hub.
 * Groups the 19 tracked competitions by category and attaches
 * upcoming + recent fixtures and last-sync metadata.
 */

import { Op } from "sequelize";
import { Competition } from "@modules/competitions/competition.model";
import { Match } from "@modules/matches/match.model";
import { Club } from "@modules/clubs/club.model";
import { SeasonSync } from "@modules/saff/seasonSync.model";
import { getCurrentSeason } from "@modules/saff/saff.service";

// ── Category definitions ──

export interface LeagueCategory {
  key: string;
  labelEn: string;
  labelAr: string;
  competitionNames: string[];
}

export const CATEGORIES: LeagueCategory[] = [
  {
    key: "senior-men",
    labelEn: "Senior Men",
    labelAr: "الرجال",
    competitionNames: [
      "Roshn Saudi League",
      "Yelo First Division",
      "King's Cup",
      "Saudi Super Cup",
      "Second Division",
      "Third Division",
    ],
  },
  {
    key: "elite",
    labelEn: "Elite",
    labelAr: "النخبة",
    competitionNames: ["Jawwy Elite U21"],
  },
  {
    key: "premier-youth",
    labelEn: "Saudi Premier Youth",
    labelAr: "الدوري السعودي الممتاز الشباب",
    competitionNames: [
      "Saudi Premier U18",
      "Saudi Premier U17",
      "Saudi Premier U16",
      "Saudi Premier U15",
    ],
  },
  {
    key: "first-div-youth",
    labelEn: "First Division Youth",
    labelAr: "دوري الدرجة الأولى الشباب",
    competitionNames: [
      "First Division U18",
      "First Division U17",
      "First Division U16",
      "First Division U15",
    ],
  },
  {
    key: "braem",
    labelEn: "Braem (Grassroots)",
    labelAr: "دوري البراعم",
    competitionNames: ["Braem U14", "Braem U13", "Braem U12", "Braem U11"],
  },
];

// ── Types ──

export interface FixtureSummary {
  id: string;
  matchDate: Date;
  homeTeam: string;
  homeTeamAr: string | null;
  awayTeam: string;
  awayTeamAr: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  status: string;
  season: string | null;
  round: string | null;
}

export interface LeagueSummary {
  id: string;
  name: string;
  nameAr: string | null;
  agencyValue: string;
  ageGroup: string | null;
  type: string;
  tier: number;
  lastSyncedAt: Date | null;
  syncStatus: "fresh" | "stale" | "empty" | "never";
  upcoming: FixtureSummary[];
  recent: FixtureSummary[];
}

export interface CategorySummary {
  key: string;
  labelEn: string;
  labelAr: string;
  leagues: LeagueSummary[];
}

// ── Helpers ──

const CLUB_INCLUDE = [
  {
    model: Club,
    as: "homeClub",
    attributes: ["id", "name", "nameAr", "logoUrl"],
    required: false,
  },
  {
    model: Club,
    as: "awayClub",
    attributes: ["id", "name", "nameAr", "logoUrl"],
    required: false,
  },
];

function toFixtureSummary(m: Match): FixtureSummary {
  const homeClub = (m as any).homeClub as Club | null;
  const awayClub = (m as any).awayClub as Club | null;

  return {
    id: m.id,
    matchDate: m.matchDate,
    homeTeam: homeClub?.name ?? m.homeTeamName ?? "",
    homeTeamAr: homeClub?.nameAr ?? null,
    awayTeam: awayClub?.name ?? m.awayTeamName ?? "",
    awayTeamAr: awayClub?.nameAr ?? null,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    venue: m.venue,
    status: m.status,
    season: m.season,
    round: m.round,
  };
}

function computeSyncStatus(
  lastSyncedAt: Date | null,
): "fresh" | "stale" | "empty" | "never" {
  if (!lastSyncedAt) return "never";
  const ageHours = (Date.now() - lastSyncedAt.getTime()) / 3_600_000;
  if (ageHours < 3) return "fresh";
  if (ageHours < 26) return "stale";
  return "stale";
}

// ── Hub Query ──

/**
 * Returns the full hub payload: all 5 categories with their leagues,
 * each league having 5 upcoming + 5 recent fixtures and sync metadata.
 */
export async function getHub(
  season: string = getCurrentSeason(),
): Promise<CategorySummary[]> {
  const now = new Date();

  // Load all 19 competitions in one query
  const allNames = CATEGORIES.flatMap((c) => c.competitionNames);
  const competitions = await Competition.findAll({
    where: { name: { [Op.in]: allNames } },
    attributes: [
      "id",
      "name",
      "nameAr",
      "agencyValue",
      "ageGroup",
      "type",
      "tier",
    ],
  });

  const competitionByName = new Map(competitions.map((c) => [c.name, c]));

  // Load last sync times in one query
  const syncRows = await SeasonSync.findAll({
    where: {
      competitionId: { [Op.in]: competitions.map((c) => c.id) },
      season,
      dataType: "fixtures",
    },
    attributes: ["competitionId", "syncedAt"],
    order: [["synced_at", "DESC"]],
  });
  const lastSyncByCompetition = new Map<string, Date>();
  for (const row of syncRows) {
    if (row.competitionId && !lastSyncByCompetition.has(row.competitionId)) {
      lastSyncByCompetition.set(row.competitionId, row.syncedAt!);
    }
  }

  const result: CategorySummary[] = [];

  for (const category of CATEGORIES) {
    const leagues: LeagueSummary[] = [];

    for (const name of category.competitionNames) {
      const comp = competitionByName.get(name);
      if (!comp) continue;

      const [upcoming, recent] = await Promise.all([
        Match.findAll({
          where: {
            competitionId: comp.id,
            season,
            status: { [Op.in]: ["upcoming", "live"] },
            matchDate: { [Op.gte]: now },
          },
          include: CLUB_INCLUDE,
          order: [["match_date", "ASC"]],
          limit: 5,
        }),
        Match.findAll({
          where: {
            competitionId: comp.id,
            season,
            status: "completed",
          },
          include: CLUB_INCLUDE,
          order: [["match_date", "DESC"]],
          limit: 5,
        }),
      ]);

      const lastSyncedAt = lastSyncByCompetition.get(comp.id) ?? null;

      leagues.push({
        id: comp.id,
        name: comp.name,
        nameAr: comp.nameAr,
        agencyValue: comp.agencyValue,
        ageGroup: comp.ageGroup,
        type: comp.type,
        tier: comp.tier,
        lastSyncedAt,
        syncStatus:
          upcoming.length === 0 && recent.length === 0
            ? lastSyncedAt
              ? "empty"
              : "never"
            : computeSyncStatus(lastSyncedAt),
        upcoming: upcoming.map(toFixtureSummary),
        recent: recent.map(toFixtureSummary),
      });
    }

    result.push({
      key: category.key,
      labelEn: category.labelEn,
      labelAr: category.labelAr,
      leagues,
    });
  }

  return result;
}

/**
 * Full match list for a single competition, paginated.
 */
export async function getCompetitionMatches(
  competitionId: string,
  season: string = getCurrentSeason(),
  page = 1,
  limit = 20,
) {
  const offset = (page - 1) * limit;
  const { count, rows } = await Match.findAndCountAll({
    where: { competitionId, season },
    include: CLUB_INCLUDE,
    order: [["match_date", "ASC"]],
    limit,
    offset,
  });

  return {
    data: rows.map(toFixtureSummary),
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}
