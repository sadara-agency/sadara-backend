import { Op, Sequelize, QueryTypes, literal } from 'sequelize';
import { Player } from './player.model';
import { Club } from '../clubs/club.model';
import { User } from '../Users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { sequelize } from '../../config/database';
import { ExternalProviderMapping } from './externalProvider.model';

// ── Lightweight computed attributes (same-row, no joins needed) ──
const COMPUTED_ATTRIBUTES: [any, string][] = [
  [
    literal(`COALESCE(
      NULLIF(CONCAT("Player".first_name_ar, ' ', "Player".last_name_ar), ' '),
      CONCAT("Player".first_name, ' ', "Player".last_name)
    )`),
    'full_name_ar',
  ],
  [
    literal(`CONCAT("Player".first_name, ' ', "Player".last_name)`),
    'full_name',
  ],
  [
    literal(`EXTRACT(YEAR FROM age(CURRENT_DATE, "Player".date_of_birth))::int`),
    'computed_age',
  ],
];

// ── Heavy computed attributes (correlated subqueries — only for single player detail) ──
const DETAIL_COMPUTED_ATTRIBUTES: [any, string][] = [
  ...COMPUTED_ATTRIBUTES,
  [literal(`(SELECT CASE WHEN c.end_date IS NULL THEN 'Active' WHEN c.end_date < CURRENT_DATE THEN 'Expired' WHEN c.end_date < CURRENT_DATE + INTERVAL '90 days' THEN 'Expiring Soon' ELSE 'Active' END FROM contracts c WHERE c.player_id = "Player".id ORDER BY c.end_date DESC NULLS FIRST LIMIT 1)`), 'contract_status'],
  [literal(`(SELECT c.end_date::text FROM contracts c WHERE c.player_id = "Player".id ORDER BY c.end_date DESC NULLS FIRST LIMIT 1)`), 'contract_end'],
  [literal(`(SELECT c.commission_pct FROM contracts c WHERE c.player_id = "Player".id AND c.commission_pct IS NOT NULL ORDER BY c.created_at DESC LIMIT 1)`), 'commission_rate'],
  [literal(`(SELECT COUNT(*)::int FROM match_players mp WHERE mp.player_id = "Player".id)`), 'matches'],
  [literal(`(SELECT COALESCE(SUM(pms.goals), 0)::int FROM player_match_stats pms WHERE pms.player_id = "Player".id)`), 'goals'],
  [literal(`(SELECT COALESCE(SUM(pms.assists), 0)::int FROM player_match_stats pms WHERE pms.player_id = "Player".id)`), 'assists'],
  [literal(`(SELECT ROUND(AVG(pms.rating), 1) FROM player_match_stats pms WHERE pms.player_id = "Player".id AND pms.rating IS NOT NULL)`), 'rating'],
  [literal(`(SELECT COALESCE(SUM(mp.minutes_played), 0)::int FROM match_players mp WHERE mp.player_id = "Player".id)`), 'minutes_played'],
  [literal(`(SELECT perf.average_rating FROM performances perf WHERE perf.player_id = "Player".id ORDER BY perf.created_at DESC LIMIT 1)`), 'performance'],
];

/**
 * Batch-load stats for a set of player IDs in ONE query using LATERAL joins.
 * Replaces 9 correlated subqueries × N rows with 1 aggregated query.
 */
async function batchLoadPlayerStats(playerIds: string[]): Promise<Map<string, Record<string, any>>> {
  if (playerIds.length === 0) return new Map();

  const rows = await sequelize.query<Record<string, any>>(
    `SELECT
       p.id AS player_id,
       -- Latest contract info (1 lateral instead of 3 subqueries)
       lc.contract_status, lc.contract_end, lc.commission_rate,
       -- Match participation (1 lateral instead of 2 subqueries)
       COALESCE(mp_agg.matches, 0) AS matches,
       COALESCE(mp_agg.minutes_played, 0) AS minutes_played,
       -- Match stats (1 lateral instead of 3 subqueries)
       COALESCE(pms_agg.goals, 0) AS goals,
       COALESCE(pms_agg.assists, 0) AS assists,
       pms_agg.rating,
       -- Latest performance
       perf_latest.performance
     FROM players p
     LEFT JOIN LATERAL (
       SELECT
         CASE
           WHEN c.end_date IS NULL THEN 'Active'
           WHEN c.end_date < CURRENT_DATE THEN 'Expired'
           WHEN c.end_date < CURRENT_DATE + INTERVAL '90 days' THEN 'Expiring Soon'
           ELSE 'Active'
         END AS contract_status,
         c.end_date::text AS contract_end,
         c.commission_pct AS commission_rate
       FROM contracts c WHERE c.player_id = p.id
       ORDER BY c.end_date DESC NULLS FIRST LIMIT 1
     ) lc ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS matches,
              COALESCE(SUM(mp.minutes_played), 0)::int AS minutes_played
       FROM match_players mp WHERE mp.player_id = p.id
     ) mp_agg ON true
     LEFT JOIN LATERAL (
       SELECT COALESCE(SUM(pms.goals), 0)::int AS goals,
              COALESCE(SUM(pms.assists), 0)::int AS assists,
              ROUND(AVG(pms.rating) FILTER (WHERE pms.rating IS NOT NULL), 1) AS rating
       FROM player_match_stats pms WHERE pms.player_id = p.id
     ) pms_agg ON true
     LEFT JOIN LATERAL (
       SELECT perf.average_rating AS performance
       FROM performances perf WHERE perf.player_id = p.id
       ORDER BY perf.created_at DESC LIMIT 1
     ) perf_latest ON true
     WHERE p.id IN (:ids)`,
    { replacements: { ids: playerIds }, type: QueryTypes.SELECT },
  );

  const map = new Map<string, Record<string, any>>();
  for (const row of rows) map.set(row.player_id, row);
  return map;
}

// ── Player sidebar counts (single query instead of 3 separate COUNT queries) ──
interface PlayerCounts {
  activeContracts: number;
  activeInjuries: number;
  openTasks: number;
}

async function getPlayerCounts(playerId: string): Promise<PlayerCounts> {
  const [result] = await sequelize.query<PlayerCounts>(
    `SELECT
       COALESCE((SELECT COUNT(*)::int FROM contracts WHERE player_id = :id AND status = 'Active'), 0) AS "activeContracts",
       COALESCE((SELECT COUNT(*)::int FROM injuries WHERE player_id = :id AND status = 'UnderTreatment'), 0) AS "activeInjuries",
       COALESCE((SELECT COUNT(*)::int FROM tasks WHERE player_id = :id AND status = 'Open'), 0) AS "openTasks"`,
    { replacements: { id: playerId }, type: QueryTypes.SELECT },
  );

  return result || { activeContracts: 0, activeInjuries: 0, openTasks: 0 };
}

// ── List Players (enriched with computed fields) ──
// Step 1: Fetch base player data with lightweight attributes (no heavy subqueries)
// Step 2: Batch-load stats for all returned player IDs in a single query
// Step 3: Merge stats into player objects
export async function listPlayers(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(queryParams, 'createdAt');

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.playerType) where.playerType = queryParams.playerType;
  if (queryParams.clubId) where.currentClubId = queryParams.clubId;
  if (queryParams.position) where.position = queryParams.position;
  if (queryParams.nationality) where.nationality = queryParams.nationality;

  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { firstNameAr: { [Op.iLike]: `%${search}%` } },
      { lastNameAr: { [Op.iLike]: `%${search}%` } },
      Sequelize.where(
        Sequelize.fn('concat', Sequelize.col('Player.first_name'), ' ', Sequelize.col('Player.last_name')),
        { [Op.iLike]: `%${search}%` },
      ),
    ];
  }

  // Step 1: Base query with only lightweight computed attributes (name, age)
  const { count, rows } = await Player.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    attributes: { include: COMPUTED_ATTRIBUTES },
    include: [
      { model: Club, as: 'club', attributes: ['id', 'name', 'nameAr', 'logoUrl'] },
      { model: User, as: 'agent', attributes: ['id', 'fullName'] },
    ],
  });

  // Step 2: Batch-load stats for all player IDs in a single query
  const playerIds = rows.map(r => r.id);
  const statsMap = await batchLoadPlayerStats(playerIds);

  // Step 3: Merge stats into each player's plain object
  const data = rows.map(row => {
    const plain = row.get({ plain: true });
    const stats = statsMap.get(row.id) || {};
    return {
      ...plain,
      contract_status: stats.contract_status ?? null,
      contract_end: stats.contract_end ?? null,
      commission_rate: stats.commission_rate ?? null,
      matches: stats.matches ?? 0,
      minutes_played: stats.minutes_played ?? 0,
      goals: stats.goals ?? 0,
      assists: stats.assists ?? 0,
      rating: stats.rating ?? null,
      performance: stats.performance ?? null,
    };
  });

  return { data, meta: buildMeta(count, page, limit) };
}

// ── Get Player by ID (With Aggregates) ──
export async function getPlayerById(id: string) {
  // Run main query + sidebar counts + performance history in parallel
  const [player, counts, performanceHistory] = await Promise.all([
    Player.findByPk(id, {
      attributes: { include: DETAIL_COMPUTED_ATTRIBUTES },
      include: ['club', 'agent'],
    }),
    getPlayerCounts(id),
    sequelize.query(
      `SELECT
         TO_CHAR(perf.created_at, 'YYYY-MM') as month,
         ROUND(AVG(perf.average_rating), 1) as rating
       FROM performances perf
       WHERE perf.player_id = :id
       GROUP BY TO_CHAR(perf.created_at, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`,
      { replacements: { id }, type: QueryTypes.SELECT },
    ).catch(() => []),
  ]);

  if (!player) throw new AppError('Player not found', 404);

  return {
    ...player.get({ plain: true }),
    counts,
    performance_history: performanceHistory,
  };
}

// ── Create/Update/Delete ──
export async function createPlayer(input: any, createdBy: string) {
  return await Player.create({ ...input, createdBy });
}

export async function updatePlayer(id: string, input: any) {
  const player = await Player.findByPk(id);
  if (!player) throw new AppError('Player not found', 404);
  return await player.update(input);
}

export async function deletePlayer(id: string) {
  const [deps] = await sequelize.query<{ active_contracts: number }>(
    `SELECT COUNT(*)::int AS active_contracts FROM contracts WHERE player_id = :id AND status = 'Active'`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  if (deps && deps.active_contracts > 0) {
    throw new AppError('Cannot delete player with active contracts. Terminate or transfer contracts first.', 400);
  }

  const deleted = await Player.destroy({ where: { id } });
  if (!deleted) throw new AppError('Player not found', 404);
  return { id };
}

// ═══════════════════════════════════════════════════════════════
// Add to: src/modules/players/player.service.ts (append these functions)
// ═══════════════════════════════════════════════════════════════


export async function getPlayerProviders(playerId: string) {
  return ExternalProviderMapping.findAll({
    where: { playerId },
    order: [['providerName', 'ASC']],
  });
}

export async function upsertPlayerProvider(playerId: string, input: {
  providerName: string; externalPlayerId: string;
  externalTeamId?: string; apiBaseUrl?: string; notes?: string;
}) {
  const [mapping] = await ExternalProviderMapping.upsert({
    playerId,
    providerName: input.providerName as any,
    externalPlayerId: input.externalPlayerId,
    externalTeamId: input.externalTeamId || null,
    apiBaseUrl: input.apiBaseUrl || null,
    notes: input.notes || null,
  } as any);
  return mapping;
}

export async function removePlayerProvider(playerId: string, providerName: string) {
  const mapping = await ExternalProviderMapping.findOne({
    where: { playerId, providerName },
  });
  if (!mapping) throw new Error('Provider mapping not found');
  await mapping.destroy();
  return { playerId, providerName };
}

 