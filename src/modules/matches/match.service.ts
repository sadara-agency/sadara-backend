import { Op, Sequelize } from 'sequelize';
import { Match, type MatchAttributes } from './match.model';
import { MatchPlayer } from './matchPlayer.model';
import { PlayerMatchStats } from './playerMatchStats.model';
import { Club } from '../clubs/club.model';
import { Player } from '../players/player.model';
import { Task } from '../tasks/task.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';

const CLUB_ATTRS = ['id', 'name', 'nameAr', 'logoUrl'] as const;
const PLAYER_ATTRS = ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'position', 'photoUrl'] as const;

// ═══════════════════════════════════════════════════════════════
//  MATCH CRUD
// ═══════════════════════════════════════════════════════════════

export async function listMatches(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'matchDate');
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.competition) where.competition = { [Op.iLike]: `%${queryParams.competition}%` };
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
    { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
    { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
  ];

  if (queryParams.playerId) {
    includeConfig.push({
      model: MatchPlayer, as: 'matchPlayers',
      where: { playerId: queryParams.playerId },
      attributes: [], required: true,
    });
  }

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    const existing = where[Op.or] || [];
    where[Op.or] = [...existing, { competition: like }, { venue: like }];
  }

  const { count, rows } = await Match.findAndCountAll({
    where, limit, offset,
    order: [[sort, order]],
    include: includeConfig,
    subQuery: false, distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getMatchById(id: string) {
  const match = await Match.findByPk(id, {
    include: [
      { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
      { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
      {
        model: MatchPlayer, as: 'matchPlayers',
        include: [{ model: Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
      },
      {
        model: PlayerMatchStats, as: 'stats',
        include: [{ model: Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
      },
    ],
  });
  if (!match) throw new AppError('Match not found', 404);

  const taskCount = await Task.count({ where: { matchId: id } }).catch(() => 0);

  return {
    ...match.get({ plain: true }),
    counts: { players: match.matchPlayers?.length ?? 0, tasks: taskCount },
  };
}

export async function getUpcomingMatches(days = 7, limit = 10) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);

  return Match.findAll({
    where: { status: 'upcoming', matchDate: { [Op.between]: [now, until] } },
    order: [['matchDate', 'ASC']], limit,
    include: [
      { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
      { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
      {
        model: MatchPlayer, as: 'matchPlayers',
        attributes: ['playerId', 'availability'],
        include: [{ model: Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr'] }],
      },
    ],
  });
}

export async function createMatch(input: any) {
  if (input.homeClubId) {
    if (!(await Club.findByPk(input.homeClubId))) throw new AppError('Home club not found', 404);
  }
  if (input.awayClubId) {
    if (!(await Club.findByPk(input.awayClubId))) throw new AppError('Away club not found', 404);
  }
  return Match.create(input);
}

export async function updateMatch(id: string, input: any) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);
  return match.update(input);
}

export async function updateScore(id: string, input: { homeScore: number; awayScore: number; status?: string }) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);
  if (match.status === 'cancelled') throw new AppError('Cannot update score for a cancelled match', 400);
  const data: any = { homeScore: input.homeScore, awayScore: input.awayScore };
  if (input.status) data.status = input.status;
  return match.update(data);
}

export async function updateMatchStatus(id: string, status: string) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);
  return match.update({ status: status as MatchAttributes['status'] });
}

export async function deleteMatch(id: string) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);
  if (match.status === 'completed') throw new AppError('Cannot delete a completed match', 400);
  await match.destroy();
  return { id };
}

// ═══════════════════════════════════════════════════════════════
//  CALENDAR (weekly/monthly view)
// ═══════════════════════════════════════════════════════════════

export async function getCalendar(params: {
  from: string; to: string;
  playerId?: string; clubId?: string; competition?: string;
}) {
  const where: any = {
    matchDate: { [Op.gte]: new Date(params.from), [Op.lte]: new Date(params.to) },
  };

  if (params.competition) where.competition = { [Op.iLike]: `%${params.competition}%` };
  if (params.clubId) {
    where[Op.or] = [{ homeClubId: params.clubId }, { awayClubId: params.clubId }];
  }

  const includeConfig: any[] = [
    { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
    { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
    {
      model: MatchPlayer, as: 'matchPlayers',
      attributes: ['playerId', 'availability'],
      include: [{ model: Player, as: 'player', attributes: ['id', 'firstName', 'lastName', 'firstNameAr', 'lastNameAr', 'photoUrl'] }],
      ...(params.playerId ? { where: { playerId: params.playerId }, required: true } : {}),
    },
  ];

  return Match.findAll({ where, order: [['matchDate', 'ASC']], include: includeConfig });
}

// ═══════════════════════════════════════════════════════════════
//  MATCH PLAYERS (assign / update / remove)
// ═══════════════════════════════════════════════════════════════

export async function getMatchPlayers(matchId: string) {
  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError('Match not found', 404);

  return MatchPlayer.findAll({
    where: { matchId },
    include: [{ model: Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
    order: [['availability', 'ASC']],
  });
}

export async function assignPlayers(matchId: string, players: Array<{
  playerId: string; availability?: string;
  positionInMatch?: string; minutesPlayed?: number; notes?: string;
}>) {
  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError('Match not found', 404);

  const playerIds = players.map(p => p.playerId);
  const existing = await Player.findAll({ where: { id: { [Op.in]: playerIds } }, attributes: ['id'] });
  if (existing.length !== playerIds.length) {
    const found = new Set(existing.map(p => p.id));
    throw new AppError(`Players not found: ${playerIds.filter(id => !found.has(id)).join(', ')}`, 404);
  }

  const records = players.map(p => ({
    matchId,
    playerId: p.playerId,
    availability: p.availability || 'starter',
    positionInMatch: p.positionInMatch || null,
    minutesPlayed: p.minutesPlayed ?? null,
    notes: p.notes || null,
  }));

  await MatchPlayer.bulkCreate(records as any, {
    updateOnDuplicate: ['availability', 'positionInMatch', 'minutesPlayed', 'notes', 'updatedAt'],
  });

  return getMatchPlayers(matchId);
}

export async function updateMatchPlayer(matchId: string, playerId: string, input: any) {
  const mp = await MatchPlayer.findOne({ where: { matchId, playerId } });
  if (!mp) throw new AppError('Player not assigned to this match', 404);
  return mp.update(input);
}

export async function removePlayerFromMatch(matchId: string, playerId: string) {
  const mp = await MatchPlayer.findOne({ where: { matchId, playerId } });
  if (!mp) throw new AppError('Player not assigned to this match', 404);
  await mp.destroy();
  return { matchId, playerId };
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER MATCH STATS
// ═══════════════════════════════════════════════════════════════

export async function getMatchStats(matchId: string) {
  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError('Match not found', 404);

  return PlayerMatchStats.findAll({
    where: { matchId },
    include: [{ model: Player, as: 'player', attributes: [...PLAYER_ATTRS] }],
  });
}

export async function upsertStats(matchId: string, stats: Array<any>) {
  const match = await Match.findByPk(matchId);
  if (!match) throw new AppError('Match not found', 404);

  const records = stats.map(s => ({ matchId, ...s }));

  await PlayerMatchStats.bulkCreate(records, {
    updateOnDuplicate: [
      'minutesPlayed', 'goals', 'assists', 'shotsTotal', 'shotsOnTarget',
      'passesTotal', 'passesCompleted', 'tacklesTotal', 'interceptions',
      'duelsWon', 'duelsTotal', 'dribblesCompleted', 'dribblesAttempted',
      'foulsCommitted', 'foulsDrawn', 'yellowCards', 'redCards',
      'rating', 'positionInMatch', 'updatedAt',
    ],
  });

  return getMatchStats(matchId);
}

export async function updatePlayerStats(matchId: string, playerId: string, input: any) {
  const stats = await PlayerMatchStats.findOne({ where: { matchId, playerId } });
  if (!stats) throw new AppError('Stats not found for this player in this match', 404);
  return stats.update(input);
}

export async function deletePlayerStats(matchId: string, playerId: string) {
  const stats = await PlayerMatchStats.findOne({ where: { matchId, playerId } });
  if (!stats) throw new AppError('Stats not found', 404);
  await stats.destroy();
  return { matchId, playerId };
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER-CENTRIC QUERIES (player profile → matches tab)
// ═══════════════════════════════════════════════════════════════

export async function getPlayerMatches(playerId: string, queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, 'matchDate');
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.competition) where.competition = { [Op.iLike]: `%${queryParams.competition}%` };
  if (queryParams.from || queryParams.to) {
    where.matchDate = {};
    if (queryParams.from) where.matchDate[Op.gte] = new Date(queryParams.from);
    if (queryParams.to) where.matchDate[Op.lte] = new Date(queryParams.to);
  }

  const { count, rows } = await Match.findAndCountAll({
    where, limit, offset,
    order: [['matchDate', 'DESC']],
    include: [
      { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
      { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
      { model: MatchPlayer, as: 'matchPlayers', where: { playerId }, required: true, attributes: ['availability', 'positionInMatch', 'minutesPlayed'] },
      { model: PlayerMatchStats, as: 'stats', where: { playerId }, required: false },
    ],
    subQuery: false, distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getPlayerAggregateStats(playerId: string, params?: { from?: string; to?: string; competition?: string }) {
  const matchWhere: any = {};
  if (params?.from || params?.to) {
    matchWhere.matchDate = {};
    if (params?.from) matchWhere.matchDate[Op.gte] = new Date(params.from);
    if (params?.to) matchWhere.matchDate[Op.lte] = new Date(params.to);
  }
  if (params?.competition) matchWhere.competition = { [Op.iLike]: `%${params.competition}%` };

  const result = await PlayerMatchStats.findAll({
    where: { playerId },
    attributes: [
      [Sequelize.fn('COUNT', Sequelize.col('PlayerMatchStats.id')), 'matchesPlayed'],
      [Sequelize.fn('SUM', Sequelize.col('goals')), 'totalGoals'],
      [Sequelize.fn('SUM', Sequelize.col('assists')), 'totalAssists'],
      [Sequelize.fn('SUM', Sequelize.col('minutes_played')), 'totalMinutes'],
      [Sequelize.fn('SUM', Sequelize.col('yellow_cards')), 'totalYellowCards'],
      [Sequelize.fn('SUM', Sequelize.col('red_cards')), 'totalRedCards'],
      [Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating'],
      [Sequelize.fn('SUM', Sequelize.col('shots_total')), 'totalShots'],
      [Sequelize.fn('SUM', Sequelize.col('shots_on_target')), 'totalShotsOnTarget'],
      [Sequelize.fn('SUM', Sequelize.col('passes_total')), 'totalPasses'],
      [Sequelize.fn('SUM', Sequelize.col('passes_completed')), 'totalPassesCompleted'],
    ],
    include: Object.keys(matchWhere).length > 0
      ? [{ model: Match, as: 'match', where: matchWhere, attributes: [] }]
      : [],
    raw: true,
  });

  return result[0] ?? {};
}