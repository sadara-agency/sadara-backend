import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { cacheOrFetch, CacheTTL, CachePrefix } from "@shared/utils/cache";
import { POSITION_GROUPS } from "@modules/players/utils/attributeConfig";

// ──────────────────────────────────────────────────────────────
// Player Portfolio Analytics — roster-wide aggregation sub-service.
//
// Mirrors the `transferPortfolio.service.ts` precedent: plain async
// functions running raw SQL via sequelize.query<T>(SQL, { type: SELECT }),
// each query group wrapped in cacheOrFetch(key, fetchFn, ttl).
//
// Schema facts (verified against the model files, 2026-06-04):
//   • players.status is lowercase 'active' | 'injured' | 'inactive'
//     → portfolio scope = status <> 'inactive'.
//   • injuries.status has NO 'Closed' — open injury = status <> 'Recovered'.
//   • No soft-delete on any involved table — never add deleted_at filters.
//   • PG returns AVG/DECIMAL as strings — cast ::numeric/::int in SQL and
//     Number() in the service.
// ──────────────────────────────────────────────────────────────

// ── Shared types ──

export interface DistributionBucket {
  key: string;
  count: number;
}

export interface PortfolioDistributions {
  nationality: DistributionBucket[];
  city: DistributionBucket[];
  club: DistributionBucket[];
  contractType: DistributionBucket[];
  position: DistributionBucket[];
  ageGroup: DistributionBucket[];
  preferredFoot: DistributionBucket[];
  height: DistributionBucket[];
  playerType: DistributionBucket[];
  mandateStatus: DistributionBucket[];
  careerStage: DistributionBucket[];
}

export interface PortfolioKpis {
  totalPlayers: number;
  averageAge: number | null;
  avgTechnicalRating: number | null;
  underDevelopment: number;
  readyForMarketing: number;
  underNegotiation: number;
}

export interface PositionInsights {
  all: DistributionBucket[];
  mostRepresented: DistributionBucket[];
  leastRepresented: DistributionBucket[];
}

export interface RankedPlayer {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  position: string | null;
  photoUrl: string | null;
  clubName: string | null;
  value: number;
}

export interface PortfolioRankings {
  period: number;
  topRated: RankedPlayer[];
  mostImproved: RankedPlayer[];
}

export interface PortfolioAll extends PortfolioDistributions {
  kpis: PortfolioKpis;
  positions: PositionInsights;
  rankings: PortfolioRankings;
}

// ── Constants ──

/** Allowed rankings windows (days). Whitelisted to keep the bound param safe. */
export const ALLOWED_PERIODS = [30, 90, 365] as const;
export type RankingsPeriod = (typeof ALLOWED_PERIODS)[number];
export const DEFAULT_PERIOD: RankingsPeriod = 90;

/** Minimum matches in a window for a player to qualify for a ranking. */
const MIN_MATCHES = 2;

/** Canonical 12-position list, flattened from POSITION_GROUPS (display order). */
const CANONICAL_POSITIONS: string[] = Object.values(POSITION_GROUPS).flat();

/** Fixed display order for bucketed distributions (set in the app layer). */
const AGE_GROUP_ORDER = ["U18", "18-21", "22-25", "26-29", "30+", "Unknown"];
const HEIGHT_ORDER = ["<170", "170-179", "180-189", "190+", "Unknown"];

/**
 * Validate/whitelist an arbitrary period value, falling back to the default.
 * Accepts a number or numeric string; anything not in ALLOWED_PERIODS → default.
 */
export function normalizePeriod(raw: unknown): RankingsPeriod {
  const n = typeof raw === "string" ? Number(raw) : raw;
  return (ALLOWED_PERIODS as readonly number[]).includes(n as number)
    ? (n as RankingsPeriod)
    : DEFAULT_PERIOD;
}

// ── Helpers ──

type CountRow = { key: string | null; count: string | number };

/** Map raw {key,count} rows → typed buckets, COALESCE-ing null keys to a label. */
function toBuckets(rows: CountRow[], nullLabel: string): DistributionBucket[] {
  return rows.map((r) => ({
    key: r.key == null || r.key === "" ? nullLabel : r.key,
    count: Number(r.count),
  }));
}

/**
 * Fold a high-cardinality distribution to top-N + an aggregated 'Other' bucket.
 * Rows are expected pre-sorted by count desc.
 */
function foldToTopN(
  buckets: DistributionBucket[],
  topN: number,
  otherLabel = "Other",
): DistributionBucket[] {
  if (buckets.length <= topN) return buckets;
  const head = buckets.slice(0, topN);
  const tailCount = buckets.slice(topN).reduce((sum, b) => sum + b.count, 0);
  if (tailCount > 0) head.push({ key: otherLabel, count: tailCount });
  return head;
}

/** Reorder buckets to a fixed display order, dropping zero-count absentees. */
function orderBuckets(rows: CountRow[], order: string[]): DistributionBucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.key == null || r.key === "" ? "Unknown" : r.key;
    map.set(key, (map.get(key) ?? 0) + Number(r.count));
  }
  return order
    .filter((k) => map.has(k))
    .map((k) => ({ key: k, count: map.get(k)! }));
}

// ── A. Distributions ──

const ACTIVE_SCOPE = `status <> 'inactive'`;

async function fetchDistributions(): Promise<PortfolioDistributions> {
  const groupBy = async (col: string): Promise<CountRow[]> =>
    sequelize.query<CountRow>(
      `SELECT ${col} AS key, COUNT(*)::int AS count
       FROM players
       WHERE ${ACTIVE_SCOPE}
       GROUP BY ${col}
       ORDER BY count DESC`,
      { type: QueryTypes.SELECT },
    );

  const [
    nationalityRows,
    contractTypeRows,
    positionRows,
    preferredFootRows,
    playerTypeRows,
    mandateStatusRows,
  ] = await Promise.all([
    groupBy("nationality"),
    groupBy("contract_type"),
    groupBy("position"),
    groupBy("preferred_foot"),
    groupBy("player_type"),
    groupBy("mandate_status"),
  ]);

  // City + club come from the joined club row.
  const clubRows = await sequelize.query<CountRow>(
    `SELECT c.name AS key, COUNT(*)::int AS count
     FROM players p
     LEFT JOIN clubs c ON c.id = p.current_club_id
     WHERE p.${ACTIVE_SCOPE}
     GROUP BY c.name
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );

  const cityRows = await sequelize.query<CountRow>(
    `SELECT c.city AS key, COUNT(*)::int AS count
     FROM players p
     LEFT JOIN clubs c ON c.id = p.current_club_id
     WHERE p.${ACTIVE_SCOPE}
     GROUP BY c.city
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );

  // Age groups — bucket from date_of_birth (nullable → 'Unknown').
  const ageRows = await sequelize.query<CountRow>(
    `SELECT
       CASE
         WHEN date_of_birth IS NULL THEN 'Unknown'
         WHEN date_part('year', age(date_of_birth)) < 18 THEN 'U18'
         WHEN date_part('year', age(date_of_birth)) BETWEEN 18 AND 21 THEN '18-21'
         WHEN date_part('year', age(date_of_birth)) BETWEEN 22 AND 25 THEN '22-25'
         WHEN date_part('year', age(date_of_birth)) BETWEEN 26 AND 29 THEN '26-29'
         ELSE '30+'
       END AS key,
       COUNT(*)::int AS count
     FROM players
     WHERE ${ACTIVE_SCOPE}
     GROUP BY key`,
    { type: QueryTypes.SELECT },
  );

  // Height groups — bucket from height_cm (nullable → 'Unknown').
  const heightRows = await sequelize.query<CountRow>(
    `SELECT
       CASE
         WHEN height_cm IS NULL THEN 'Unknown'
         WHEN height_cm < 170 THEN '<170'
         WHEN height_cm < 180 THEN '170-179'
         WHEN height_cm < 190 THEN '180-189'
         ELSE '190+'
       END AS key,
       COUNT(*)::int AS count
     FROM players
     WHERE ${ACTIVE_SCOPE}
     GROUP BY key`,
    { type: QueryTypes.SELECT },
  );

  // Career stage — latest active evolution cycle tier + 'Unclassified'.
  // LATERAL LIMIT 1 prevents fan-out if a player has >1 active cycle.
  const careerRows = await sequelize.query<CountRow>(
    `SELECT COALESCE(ec.tier, 'Unclassified') AS key, COUNT(*)::int AS count
     FROM players p
     LEFT JOIN LATERAL (
       SELECT tier FROM evolution_cycles e
       WHERE e.player_id = p.id AND e.status = 'Active'
       ORDER BY e.created_at DESC LIMIT 1
     ) ec ON true
     WHERE p.${ACTIVE_SCOPE}
     GROUP BY COALESCE(ec.tier, 'Unclassified')
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );

  return {
    nationality: foldToTopN(toBuckets(nationalityRows, "Unknown"), 15),
    city: foldToTopN(toBuckets(cityRows, "Unknown"), 15),
    club: foldToTopN(toBuckets(clubRows, "Unattached"), 15),
    contractType: toBuckets(contractTypeRows, "Unknown"),
    position: toBuckets(positionRows, "Unassigned"),
    ageGroup: orderBuckets(ageRows, AGE_GROUP_ORDER),
    preferredFoot: toBuckets(preferredFootRows, "Unknown"),
    height: orderBuckets(heightRows, HEIGHT_ORDER),
    playerType: toBuckets(playerTypeRows, "Unknown"),
    mandateStatus: toBuckets(mandateStatusRows, "None"),
    careerStage: toBuckets(careerRows, "Unclassified"),
  };
}

export function getDistributions(): Promise<PortfolioDistributions> {
  return cacheOrFetch(
    `${CachePrefix.DASHBOARD}:portfolio-distributions`,
    fetchDistributions,
    CacheTTL.LONG,
  );
}

// ── B. KPIs ──

async function fetchKpis(): Promise<PortfolioKpis> {
  const baseRows = await sequelize.query<{
    total: number;
    avg_age: string | null;
  }>(
    `SELECT
       COUNT(*)::int AS total,
       AVG(date_part('year', age(date_of_birth)))
         FILTER (WHERE date_of_birth IS NOT NULL) AS avg_age
     FROM players
     WHERE ${ACTIVE_SCOPE}`,
    { type: QueryTypes.SELECT },
  );

  // Avg technical rating — AVG(player_match_stats.rating) across the portfolio.
  const ratingRows = await sequelize.query<{ avg_rating: string | null }>(
    `SELECT AVG(s.rating) AS avg_rating
     FROM player_match_stats s
     JOIN players p ON p.id = s.player_id
     WHERE s.rating IS NOT NULL AND p.${ACTIVE_SCOPE}`,
    { type: QueryTypes.SELECT },
  );

  // Under development — distinct active players with an active, non-template program.
  const devRows = await sequelize.query<{ count: number }>(
    `SELECT COUNT(DISTINCT dp.player_id)::int AS count
     FROM development_programs dp
     JOIN players p ON p.id = dp.player_id
     WHERE dp.is_active = true
       AND dp.player_id IS NOT NULL
       AND p.${ACTIVE_SCOPE}`,
    { type: QueryTypes.SELECT },
  );

  // Ready for marketing — derived rule (open injury = status <> 'Recovered').
  const readyRows = await sequelize.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM players p
     WHERE p.status = 'active'
       AND p.player_type = 'Pro'
       AND p.mandate_status = 'Signed'
       AND p.position IS NOT NULL AND p.position <> ''
       AND NOT EXISTS (
         SELECT 1 FROM injuries i
         WHERE i.player_id = p.id AND i.status <> 'Recovered'
       )`,
    { type: QueryTypes.SELECT },
  );

  // Under negotiation — distinct players with an offer in 'Negotiation'.
  const negotiationRows = await sequelize.query<{ count: number }>(
    `SELECT COUNT(DISTINCT o.player_id)::int AS count
     FROM offers o
     JOIN players p ON p.id = o.player_id
     WHERE o.status = 'Negotiation' AND p.${ACTIVE_SCOPE}`,
    { type: QueryTypes.SELECT },
  );

  const avgAge = baseRows[0]?.avg_age;
  const avgRating = ratingRows[0]?.avg_rating;

  return {
    totalPlayers: Number(baseRows[0]?.total ?? 0),
    averageAge: avgAge == null ? null : Number(Number(avgAge).toFixed(1)),
    avgTechnicalRating:
      avgRating == null ? null : Number(Number(avgRating).toFixed(2)),
    underDevelopment: Number(devRows[0]?.count ?? 0),
    readyForMarketing: Number(readyRows[0]?.count ?? 0),
    underNegotiation: Number(negotiationRows[0]?.count ?? 0),
  };
}

export function getKpis(): Promise<PortfolioKpis> {
  return cacheOrFetch(
    `${CachePrefix.DASHBOARD}:portfolio-kpis`,
    fetchKpis,
    CacheTTL.LONG,
  );
}

// ── C. Position insights ──

async function fetchPositions(): Promise<PositionInsights> {
  const rows = await sequelize.query<CountRow>(
    `SELECT position AS key, COUNT(*)::int AS count
     FROM players
     WHERE ${ACTIVE_SCOPE} AND position IS NOT NULL AND position <> ''
     GROUP BY position
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );

  const all = toBuckets(rows, "Unassigned");
  // "Gaps" = bottom positions you HAVE (fewest players among present positions),
  // not a canonical-list diff — per the user's choice. CANONICAL_POSITIONS is
  // retained for labelling/ordering on the client.
  const mostRepresented = all.slice(0, 5);
  const leastRepresented = [...all].reverse().slice(0, 5);

  return { all, mostRepresented, leastRepresented };
}

export function getPositions(): Promise<PositionInsights> {
  return cacheOrFetch(
    `${CachePrefix.DASHBOARD}:portfolio-positions`,
    fetchPositions,
    CacheTTL.LONG,
  );
}

// ── D. Rankings (period-scoped) ──

type RankRow = {
  id: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  position: string | null;
  photo_url: string | null;
  club_name: string | null;
  value: string | number;
};

function toRankedPlayers(rows: RankRow[]): RankedPlayer[] {
  return rows.map((r) => ({
    id: r.id,
    fullName: `${r.first_name} ${r.last_name}`.trim(),
    fullNameAr:
      r.first_name_ar && r.last_name_ar
        ? `${r.first_name_ar} ${r.last_name_ar}`.trim()
        : null,
    position: r.position,
    photoUrl: r.photo_url,
    clubName: r.club_name,
    value: Number(r.value),
  }));
}

async function fetchRankings(
  period: RankingsPeriod,
): Promise<PortfolioRankings> {
  // Top-rated — avg rating in the period, min 2 matches.
  const topRatedRows = await sequelize.query<RankRow>(
    `SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            p.position, p.photo_url, c.name AS club_name,
            ROUND(AVG(s.rating)::numeric, 2) AS value
     FROM player_match_stats s
     JOIN matches m ON m.id = s.match_id
     JOIN players p ON p.id = s.player_id
     LEFT JOIN clubs c ON c.id = p.current_club_id
     WHERE s.rating IS NOT NULL
       AND p.status <> 'inactive'
       AND m.match_date >= NOW() - (:period || ' days')::interval
     GROUP BY p.id, c.name
     HAVING COUNT(*) >= :minMatches
     ORDER BY value DESC
     LIMIT 10`,
    {
      type: QueryTypes.SELECT,
      replacements: { period, minMatches: MIN_MATCHES },
    },
  );

  // Most-improved — avg-rating delta vs the prior equal-length window.
  // INNER JOIN of cur+prev windows excludes players absent from either.
  const mostImprovedRows = await sequelize.query<RankRow>(
    `WITH cur AS (
       SELECT s.player_id, AVG(s.rating) avg_cur, COUNT(*) n
       FROM player_match_stats s JOIN matches m ON m.id = s.match_id
       WHERE s.rating IS NOT NULL
         AND m.match_date >= NOW() - (:period || ' days')::interval
       GROUP BY s.player_id
     ),
     prev AS (
       SELECT s.player_id, AVG(s.rating) avg_prev, COUNT(*) n
       FROM player_match_stats s JOIN matches m ON m.id = s.match_id
       WHERE s.rating IS NOT NULL
         AND m.match_date >= NOW() - (2 * :period || ' days')::interval
         AND m.match_date <  NOW() - (:period || ' days')::interval
       GROUP BY s.player_id
     )
     SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            p.position, p.photo_url, c.name AS club_name,
            ROUND((cur.avg_cur - prev.avg_prev)::numeric, 2) AS value
     FROM cur
     JOIN prev ON prev.player_id = cur.player_id
     JOIN players p ON p.id = cur.player_id
     LEFT JOIN clubs c ON c.id = p.current_club_id
     WHERE cur.n >= :minMatches AND prev.n >= :minMatches
       AND cur.avg_cur > prev.avg_prev
       AND p.status <> 'inactive'
     ORDER BY value DESC
     LIMIT 10`,
    {
      type: QueryTypes.SELECT,
      replacements: { period, minMatches: MIN_MATCHES },
    },
  );

  return {
    period,
    topRated: toRankedPlayers(topRatedRows),
    mostImproved: toRankedPlayers(mostImprovedRows),
  };
}

export function getRankings(rawPeriod?: unknown): Promise<PortfolioRankings> {
  const period = normalizePeriod(rawPeriod);
  return cacheOrFetch(
    `${CachePrefix.DASHBOARD}:portfolio-rankings:${period}`,
    () => fetchRankings(period),
    CacheTTL.MEDIUM,
  );
}

// ── E. Batched: all of A–D (default period) ──

export async function getPortfolioAll(): Promise<PortfolioAll> {
  const [distributions, kpis, positions, rankings] = await Promise.all([
    getDistributions(),
    getKpis(),
    getPositions(),
    getRankings(DEFAULT_PERIOD),
  ]);

  return { ...distributions, kpis, positions, rankings };
}
