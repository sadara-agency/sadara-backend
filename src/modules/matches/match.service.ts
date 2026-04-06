import { Op, Sequelize } from "sequelize";
import { Match, type MatchAttributes } from "@modules/matches/match.model";
import { MatchPlayer } from "@modules/matches/matchPlayer.model";
import { PlayerMatchStats } from "@modules/matches/playerMatchStats.model";
import { MatchAnalysis } from "@modules/matches/matchAnalysis.model";
import { Club } from "@modules/clubs/club.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { generateDisplayId } from "@shared/utils/displayId";

const CLUB_ATTRS = ["id", "name", "nameAr", "logoUrl"] as const;
const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;

// ═══════════════════════════════════════════════════════════════
//  MATCH CRUD
// ═══════════════════════════════════════════════════════════════

export async function listMatches(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "matchDate",
  );
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.competition)
    where.competition = { [Op.iLike]: `%${queryParams.competition}%` };
  if (queryParams.season) where.season = queryParams.season;

  if (queryParams.clubId) {
    where[Op.or] = [
      { homeClubId: queryParams.clubId },
      { awayClubId: queryParams.clubId },
    ];
  }

  if (queryParams.from || queryParams.to) {
    where.matchDate = {};
    if (queryParams.from) where.matchDate[Op.gte] = new Date(queryParams.from);
    if (queryParams.to) where.matchDate[Op.lte] = new Date(queryParams.to);
  }

  const includeConfig: any[] = [
    { model: Club, as: "homeClub", attributes: [...CLUB_ATTRS] },
    { model: Club, as: "awayClub", attributes: [...CLUB_ATTRS] },
  ];

  if (queryParams.playerId) {
    includeConfig.push({
      model: MatchPlayer,
      as: "matchPlayers",
      where: { playerId: queryParams.playerId },
      attributes: [],
      required: true,
    });
  }

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    const searchConditions = [
      { competition: like },
      { venue: like },
      { "$homeClub.name$": like },
      { "$homeClub.name_ar$": like },
      { "$awayClub.name$": like },
      { "$awayClub.name_ar$": like },
    ];
    if (where[Op.or]) {
      // Combine club filter with search using Op.and
      where[Op.and] = [
        { [Op.or]: where[Op.or] },
        { [Op.or]: searchConditions },
      ];
      delete where[Op.or];
    } else {
      where[Op.or] = searchConditions;
    }
  }

  // Build a where clause without the status filter to get global counts
  const { status: _status, ...whereWithoutStatus } = where;

  // Run both queries concurrently for better performance
  const [{ count, rows }, statusCounts] = await Promise.all([
    Match.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sort, order]],
      include: includeConfig,
      subQuery: false,
      distinct: true,
    }),
    Match.findAll({
      attributes: [
        "status",
        [Sequelize.fn("COUNT", Sequelize.col("Match.id")), "count"],
      ],
      where:
        Object.keys(whereWithoutStatus).length > 0
          ? whereWithoutStatus
          : undefined,
      group: ["status"],
      raw: true,
    }) as unknown as Promise<{ status: string; count: string }[]>,
  ]);

  const stats = { upcoming: 0, live: 0, completed: 0, cancelled: 0, total: 0 };
  for (const row of statusCounts) {
    const c = Number(row.count);
    if (row.status in stats) stats[row.status as keyof typeof stats] = c;
    stats.total += c;
  }

  return { data: rows, meta: buildMeta(count, page, limit), stats };
}

export async function getMatchById(id: string) {
  const match = await Match.findByPk(id, {
    attributes: {
      include: [
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM tasks WHERE tasks.match_id = "Match".id)`,
          ),
          "taskCount",
        ],
      ],
    },
    include: [
      { model: Club, as: "homeClub", attributes: [...CLUB_ATTRS] },
      { model: Club, as: "awayClub", attributes: [...CLUB_ATTRS] },
      {
        model: MatchPlayer,
        as: "matchPlayers",
        include: [
          { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
        ],
      },
      {
        model: PlayerMatchStats,
        as: "stats",
        include: [
          { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
        ],
      },
    ],
  });
  if (!match) throw new AppError("Match not found", 404);

  const plain = match.get({ plain: true }) as any;
  return {
    ...plain,
    counts: {
      players: match.matchPlayers?.length ?? 0,
      tasks: Number(plain.taskCount) || 0,
    },
  };
}

export async function getUpcomingMatches(days = 7, limit = 10) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);

  return Match.findAll({
    where: { status: "upcoming", matchDate: { [Op.between]: [now, until] } },
    order: [["matchDate", "ASC"]],
    limit,
    include: [
      { model: Club, as: "homeClub", attributes: [...CLUB_ATTRS] },
      { model: Club, as: "awayClub", attributes: [...CLUB_ATTRS] },
      {
        model: MatchPlayer,
        as: "matchPlayers",
        attributes: ["playerId", "availability"],
        include: [
          {
            model: Player,
            as: "player",
            attributes: [
              "id",
              "firstName",
              "lastName",
              "firstNameAr",
              "lastNameAr",
            ],
          },
        ],
      },
    ],
  });
}

export async function createMatch(input: any) {
  await findOrThrow(Club, input.homeClubId, "Home club");
  await findOrThrow(Club, input.awayClubId, "Away club");

  // Enforce minimum 3-day gap between matches for each club
  const matchDate = new Date(input.matchDate);
  const threeDaysBefore = new Date(matchDate.getTime() - 3 * 86_400_000);
  const threeDaysAfter = new Date(matchDate.getTime() + 3 * 86_400_000);

  const clubIds = [input.homeClubId, input.awayClubId];
  const conflicting = await Match.findOne({
    where: {
      status: { [Op.ne]: "cancelled" },
      matchDate: { [Op.between]: [threeDaysBefore, threeDaysAfter] },
      [Op.or]: [
        { homeClubId: { [Op.in]: clubIds } },
        { awayClubId: { [Op.in]: clubIds } },
      ],
    },
  });

  if (conflicting) {
    const conflictDate = new Date(conflicting.matchDate)
      .toISOString()
      .split("T")[0];
    throw new AppError(
      `One of the clubs already has a match on ${conflictDate}. There must be at least a 3-day gap between matches.`,
      409,
    );
  }

  const displayId = await generateDisplayId("matches");
  const match = await Match.create({ ...input, displayId });
  return getMatchById(match.id);
}

export async function updateMatch(id: string, input: any) {
  const match = await findOrThrow(Match, id, "Match");
  return match.update(input);
}

export async function updateScore(
  id: string,
  input: { homeScore: number; awayScore: number; status?: string },
) {
  const match = await findOrThrow(Match, id, "Match");
  if (match.status === "cancelled")
    throw new AppError("Cannot update score for a cancelled match", 400);
  const data: any = { homeScore: input.homeScore, awayScore: input.awayScore };
  if (input.status) data.status = input.status;
  return match.update(data);
}

export async function updateMatchStatus(id: string, status: string) {
  const match = await findOrThrow(Match, id, "Match");

  // Status transition rules
  const current = match.status;

  // Cannot cancel a live match
  if (status === "cancelled" && current === "live") {
    throw new AppError("Cannot cancel a live match. End the match first.", 400);
  }

  // Going live requires at least 1 assigned player
  if (status === "live" && current === "upcoming") {
    const playerCount = await MatchPlayer.count({ where: { matchId: id } });
    if (playerCount === 0) {
      throw new AppError(
        "Cannot start a match without any assigned players.",
        400,
      );
    }
    // Require a valid match time (not midnight default)
    const matchDate = new Date(match.matchDate);
    if (matchDate.getUTCHours() === 0 && matchDate.getUTCMinutes() === 0) {
      throw new AppError(
        "Cannot start a match without a valid match time. Please set the match time first.",
        400,
      );
    }
  }

  return match.update({ status: status as MatchAttributes["status"] });
}

export async function deleteMatch(id: string) {
  const match = await findOrThrow(Match, id, "Match");
  if (match.status === "completed")
    throw new AppError("Cannot delete a completed match", 400);
  await match.destroy();
  return { id };
}

// ═══════════════════════════════════════════════════════════════
//  CALENDAR (weekly/monthly view)
// ═══════════════════════════════════════════════════════════════

export async function getCalendar(params: {
  from: string;
  to: string;
  playerId?: string;
  clubId?: string;
  competition?: string;
}) {
  const where: any = {
    matchDate: {
      [Op.gte]: new Date(params.from),
      [Op.lte]: new Date(params.to),
    },
  };

  if (params.competition)
    where.competition = { [Op.iLike]: `%${params.competition}%` };
  if (params.clubId) {
    where[Op.or] = [
      { homeClubId: params.clubId },
      { awayClubId: params.clubId },
    ];
  }

  const includeConfig: any[] = [
    { model: Club, as: "homeClub", attributes: [...CLUB_ATTRS] },
    { model: Club, as: "awayClub", attributes: [...CLUB_ATTRS] },
    {
      model: MatchPlayer,
      as: "matchPlayers",
      attributes: ["playerId", "availability"],
      include: [
        {
          model: Player,
          as: "player",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "firstNameAr",
            "lastNameAr",
            "photoUrl",
          ],
        },
      ],
      ...(params.playerId
        ? { where: { playerId: params.playerId }, required: true }
        : {}),
    },
  ];

  return Match.findAll({
    where,
    order: [["matchDate", "ASC"]],
    include: includeConfig,
  });
}

// ═══════════════════════════════════════════════════════════════
//  MATCH PLAYERS (assign / update / remove)
// ═══════════════════════════════════════════════════════════════

export async function getMatchPlayers(matchId: string) {
  await findOrThrow(Match, matchId, "Match");

  return MatchPlayer.findAll({
    where: { matchId },
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
    order: [["availability", "ASC"]],
  });
}

export async function assignPlayers(
  matchId: string,
  players: Array<{
    playerId: string;
    availability?: string;
    positionInMatch?: string;
    minutesPlayed?: number;
    notes?: string;
  }>,
) {
  await findOrThrow(Match, matchId, "Match");

  const playerIds = players.map((p) => p.playerId);
  const existing = await Player.findAll({
    where: { id: { [Op.in]: playerIds } },
    attributes: ["id"],
  });
  if (existing.length !== playerIds.length) {
    const found = new Set(existing.map((p) => p.id));
    throw new AppError(
      `Players not found: ${playerIds.filter((id) => !found.has(id)).join(", ")}`,
      404,
    );
  }

  // Validate max 11 starters
  const currentStarters = await MatchPlayer.count({
    where: { matchId, availability: "starter" },
  });
  const newStarters = players.filter(
    (p) => (p.availability || "starter") === "starter",
  ).length;
  if (currentStarters + newStarters > 11) {
    throw new AppError(
      `Cannot exceed 11 starters. Currently ${currentStarters}, trying to add ${newStarters}.`,
      400,
    );
  }

  const records = players.map((p) => ({
    matchId,
    playerId: p.playerId,
    availability: p.availability || "starter",
    positionInMatch: p.positionInMatch || null,
    minutesPlayed: p.minutesPlayed ?? null,
    notes: p.notes || null,
  }));

  await MatchPlayer.bulkCreate(records as any, {
    updateOnDuplicate: [
      "availability",
      "positionInMatch",
      "minutesPlayed",
      "notes",
      "updatedAt",
    ],
  });

  return getMatchPlayers(matchId);
}

export async function updateMatchPlayer(
  matchId: string,
  playerId: string,
  input: any,
) {
  const mp = await MatchPlayer.findOne({ where: { matchId, playerId } });
  if (!mp) throw new AppError("Player not assigned to this match", 404);

  // Validate max 11 starters when changing to starter
  if (input.availability === "starter" && mp.availability !== "starter") {
    const currentStarters = await MatchPlayer.count({
      where: { matchId, availability: "starter" },
    });
    if (currentStarters >= 11) {
      throw new AppError("Cannot exceed 11 starters per match.", 400);
    }
  }

  return mp.update(input);
}

export async function removePlayerFromMatch(matchId: string, playerId: string) {
  const mp = await MatchPlayer.findOne({ where: { matchId, playerId } });
  if (!mp) throw new AppError("Player not assigned to this match", 404);
  await mp.destroy();
  return { matchId, playerId };
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER MATCH STATS
// ═══════════════════════════════════════════════════════════════

export async function getMatchStats(matchId: string) {
  await findOrThrow(Match, matchId, "Match");

  return PlayerMatchStats.findAll({
    where: { matchId },
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
  });
}

export async function upsertStats(matchId: string, stats: Array<any>) {
  await findOrThrow(Match, matchId, "Match");

  const records = stats.map((s) => ({ matchId, ...s }));

  await PlayerMatchStats.bulkCreate(records, {
    updateOnDuplicate: [
      "minutesPlayed",
      "goals",
      "assists",
      "shotsTotal",
      "shotsOnTarget",
      "passesTotal",
      "passesCompleted",
      "tacklesTotal",
      "interceptions",
      "duelsWon",
      "duelsTotal",
      "dribblesCompleted",
      "dribblesAttempted",
      "foulsCommitted",
      "foulsDrawn",
      "yellowCards",
      "redCards",
      "rating",
      "positionInMatch",
      "updatedAt",
    ],
  });

  return getMatchStats(matchId);
}

export async function updatePlayerStats(
  matchId: string,
  playerId: string,
  input: any,
) {
  const stats = await PlayerMatchStats.findOne({
    where: { matchId, playerId },
  });
  if (!stats)
    throw new AppError("Stats not found for this player in this match", 404);
  return stats.update(input);
}

export async function deletePlayerStats(matchId: string, playerId: string) {
  const stats = await PlayerMatchStats.findOne({
    where: { matchId, playerId },
  });
  if (!stats) throw new AppError("Stats not found", 404);
  await stats.destroy();
  return { matchId, playerId };
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER-CENTRIC QUERIES (player profile → matches tab)
// ═══════════════════════════════════════════════════════════════

export async function getPlayerMatches(playerId: string, queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "matchDate");
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.competition)
    where.competition = { [Op.iLike]: `%${queryParams.competition}%` };
  if (queryParams.from || queryParams.to) {
    where.matchDate = {};
    if (queryParams.from) where.matchDate[Op.gte] = new Date(queryParams.from);
    if (queryParams.to) where.matchDate[Op.lte] = new Date(queryParams.to);
  }

  const { count, rows } = await Match.findAndCountAll({
    where,
    limit,
    offset,
    order: [["matchDate", "DESC"]],
    include: [
      { model: Club, as: "homeClub", attributes: [...CLUB_ATTRS] },
      { model: Club, as: "awayClub", attributes: [...CLUB_ATTRS] },
      {
        model: MatchPlayer,
        as: "matchPlayers",
        where: { playerId },
        required: true,
        attributes: ["availability", "positionInMatch", "minutesPlayed"],
      },
      {
        model: PlayerMatchStats,
        as: "stats",
        where: { playerId },
        required: false,
      },
    ],
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getPlayerAggregateStats(
  playerId: string,
  params?: { from?: string; to?: string; competition?: string },
) {
  const matchWhere: any = {};
  if (params?.from || params?.to) {
    matchWhere.matchDate = {};
    if (params?.from) matchWhere.matchDate[Op.gte] = new Date(params.from);
    if (params?.to) matchWhere.matchDate[Op.lte] = new Date(params.to);
  }
  if (params?.competition)
    matchWhere.competition = { [Op.iLike]: `%${params.competition}%` };

  const result = await PlayerMatchStats.findAll({
    where: { playerId },
    attributes: [
      [
        Sequelize.fn("COUNT", Sequelize.col("PlayerMatchStats.id")),
        "matchesPlayed",
      ],
      [Sequelize.fn("SUM", Sequelize.col("goals")), "totalGoals"],
      [Sequelize.fn("SUM", Sequelize.col("assists")), "totalAssists"],
      [Sequelize.fn("SUM", Sequelize.col("minutes_played")), "totalMinutes"],
      [Sequelize.fn("SUM", Sequelize.col("yellow_cards")), "totalYellowCards"],
      [Sequelize.fn("SUM", Sequelize.col("red_cards")), "totalRedCards"],
      [Sequelize.fn("AVG", Sequelize.col("rating")), "averageRating"],
      [Sequelize.fn("SUM", Sequelize.col("shots_total")), "totalShots"],
      [
        Sequelize.fn("SUM", Sequelize.col("shots_on_target")),
        "totalShotsOnTarget",
      ],
      [Sequelize.fn("SUM", Sequelize.col("passes_total")), "totalPasses"],
      [
        Sequelize.fn("SUM", Sequelize.col("passes_completed")),
        "totalPassesCompleted",
      ],
      // Defensive / midfield stats
      [Sequelize.fn("SUM", Sequelize.col("tackles_total")), "totalTackles"],
      [
        Sequelize.fn("SUM", Sequelize.col("interceptions")),
        "totalInterceptions",
      ],
      [Sequelize.fn("SUM", Sequelize.col("duels_won")), "totalDuelsWon"],
      [Sequelize.fn("SUM", Sequelize.col("duels_total")), "totalDuelsTotal"],
      [
        Sequelize.fn("SUM", Sequelize.col("dribbles_completed")),
        "totalDribblesCompleted",
      ],
      [
        Sequelize.fn("SUM", Sequelize.col("dribbles_attempted")),
        "totalDribblesAttempted",
      ],
      [Sequelize.fn("SUM", Sequelize.col("key_passes")), "totalKeyPasses"],
      // Goalkeeper stats
      [Sequelize.fn("SUM", Sequelize.col("saves")), "totalSaves"],
      [
        Sequelize.fn(
          "SUM",
          Sequelize.cast(Sequelize.col("clean_sheet"), "integer"),
        ),
        "totalCleanSheets",
      ],
      [
        Sequelize.fn("SUM", Sequelize.col("goals_conceded")),
        "totalGoalsConceded",
      ],
      [
        Sequelize.fn("SUM", Sequelize.col("penalties_saved")),
        "totalPenaltiesSaved",
      ],
    ],
    include:
      Object.keys(matchWhere).length > 0
        ? [{ model: Match, as: "match", where: matchWhere, attributes: [] }]
        : [],
    raw: true,
  });

  return result[0] ?? {};
}

// ═══════════════════════════════════════════════════════════════
//  MATCH ANALYSIS
// ═══════════════════════════════════════════════════════════════

const ANALYST_ATTRS = ["id", "fullName", "email"] as const;

export async function getMatchAnalyses(matchId: string) {
  await findOrThrow(Match, matchId, "Match");
  return MatchAnalysis.findAll({
    where: { matchId },
    include: [{ model: User, as: "analyst", attributes: [...ANALYST_ATTRS] }],
    order: [["createdAt", "DESC"]],
  });
}

export async function getMatchAnalysisById(
  matchId: string,
  analysisId: string,
) {
  const analysis = await MatchAnalysis.findOne({
    where: { id: analysisId, matchId },
    include: [{ model: User, as: "analyst", attributes: [...ANALYST_ATTRS] }],
  });
  if (!analysis) throw new AppError("Analysis not found", 404);
  return analysis;
}

export async function createMatchAnalysis(
  matchId: string,
  analystId: string,
  input: any,
) {
  await findOrThrow(Match, matchId, "Match");
  const analysis = await MatchAnalysis.create({ ...input, matchId, analystId });
  return getMatchAnalysisById(matchId, analysis.id);
}

export async function updateMatchAnalysis(
  matchId: string,
  analysisId: string,
  input: any,
) {
  const analysis = await MatchAnalysis.findOne({
    where: { id: analysisId, matchId },
  });
  if (!analysis) throw new AppError("Analysis not found", 404);
  await analysis.update(input);
  return getMatchAnalysisById(matchId, analysisId);
}

export async function publishMatchAnalysis(
  matchId: string,
  analysisId: string,
) {
  const analysis = await MatchAnalysis.findOne({
    where: { id: analysisId, matchId },
  });
  if (!analysis) throw new AppError("Analysis not found", 404);
  await analysis.update({ status: "published" });
  return getMatchAnalysisById(matchId, analysisId);
}

export async function deleteMatchAnalysis(matchId: string, analysisId: string) {
  const analysis = await MatchAnalysis.findOne({
    where: { id: analysisId, matchId },
  });
  if (!analysis) throw new AppError("Analysis not found", 404);
  await analysis.destroy();
  return { id: analysisId, matchId };
}
