import { Op, Sequelize } from 'sequelize';
import { Match, type MatchAttributes } from './match.model';
import { Club } from '../clubs/club.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { sequelize } from '../../config/database';

const CLUB_ATTRS = ['id', 'name', 'nameAr', 'logoUrl'] as const;

// ── List Matches ──

export async function listMatches(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'matchDate');

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.competition) where.competition = { [Op.iLike]: `%${queryParams.competition}%` };
  if (queryParams.season) where.season = queryParams.season;

  // Filter by club (either home or away)
  if (queryParams.clubId) {
    where[Op.or] = [
      { homeClubId: queryParams.clubId },
      { awayClubId: queryParams.clubId },
    ];
  }

  // Date range
  if (queryParams.from || queryParams.to) {
    where.matchDate = {};
    if (queryParams.from) where.matchDate[Op.gte] = new Date(queryParams.from);
    if (queryParams.to) where.matchDate[Op.lte] = new Date(queryParams.to);
  }

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [
      ...(where[Op.or] || []),
      { competition: like },
      { venue: like },
      { '$homeClub.name$': like },
      { '$awayClub.name$': like },
    ];
  }

  const { count, rows } = await Match.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
      { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
    ],
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Match by ID ──

export async function getMatchById(id: string) {
  const match = await Match.findByPk(id, {
    include: [
      { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
      { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
    ],
  });

  if (!match) throw new AppError('Match not found', 404);

  // Fetch related counts in parallel
  const [playerCount, taskCount] = await Promise.all([
    sequelize.models.MatchPlayer?.count({ where: { matchId: id } }).catch(() => 0) ?? 0,
    sequelize.models.Task?.count({ where: { matchId: id } }).catch(() => 0) ?? 0,
  ]);

  return {
    ...match.get({ plain: true }),
    counts: { players: playerCount, tasks: taskCount },
  };
}

// ── Get Upcoming Matches (dashboard widget) ──

export async function getUpcomingMatches(days = 7, limit = 10) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);

  return await Match.findAll({
    where: {
      status: 'upcoming',
      matchDate: { [Op.between]: [now, until] },
    },
    order: [['matchDate', 'ASC']],
    limit,
    include: [
      { model: Club, as: 'homeClub', attributes: [...CLUB_ATTRS] },
      { model: Club, as: 'awayClub', attributes: [...CLUB_ATTRS] },
    ],
  });
}

// ── Create Match ──

export async function createMatch(input: any) {
  // Verify clubs exist if provided
  if (input.homeClubId) {
    const club = await Club.findByPk(input.homeClubId);
    if (!club) throw new AppError('Home club not found', 404);
  }
  if (input.awayClubId) {
    const club = await Club.findByPk(input.awayClubId);
    if (!club) throw new AppError('Away club not found', 404);
  }

  return await Match.create(input);
}

// ── Update Match ──

export async function updateMatch(id: string, input: any) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);

  return await match.update(input);
}

// ── Update Score ──

export async function updateScore(id: string, input: { homeScore: number; awayScore: number; status?: string }) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);

  if (match.status === 'cancelled') {
    throw new AppError('Cannot update score for a cancelled match', 400);
  }

  const updateData: any = {
    homeScore: input.homeScore,
    awayScore: input.awayScore,
  };

  // Auto-transition to live/completed if provided
  if (input.status) updateData.status = input.status;

  return await match.update(updateData);
}

// ── Update Status ──

export async function updateMatchStatus(id: string, status: string) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);

  return await match.update({ status: status as MatchAttributes['status'] });
}

// ── Delete Match ──

export async function deleteMatch(id: string) {
  const match = await Match.findByPk(id);
  if (!match) throw new AppError('Match not found', 404);

  if (match.status === 'completed') {
    throw new AppError('Cannot delete a completed match', 400);
  }

  await match.destroy();
  return { id };
}