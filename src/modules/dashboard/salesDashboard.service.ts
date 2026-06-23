import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import {
  cacheOrFetch,
  buildCacheKey,
  CacheTTL,
  CachePrefix,
} from "@shared/utils/cache";

// ──────────────────────────────────────────────────────────────
// Leadership Sales Dashboard — descriptive commercial analytics.
//
// Mirrors the `portfolioAnalytics.service.ts` precedent: plain async
// functions running raw SQL via sequelize.query<T>(SQL, { type: SELECT }),
// each query group wrapped in cacheOrFetch(key, fetchFn, ttl). Numeric
// aggregates are cast in SQL and coerced with Number() in the service
// because PG returns NUMERIC/AVG as strings.
//
// Domain mapping (verified against the model files, 2026-06-19):
//   • The agency's commercial funnel is offers → contracts → payments.
//     `referrals` here are CLINICAL/player-care items, NOT sales leads,
//     and are deliberately excluded.
//   • offers.status enum: 'New' | 'Under Review' | 'Negotiation' |
//     'Accepted' | 'Rejected' | 'Closed' | 'Converted'. Open pipeline =
//     New/Under Review/Negotiation/Accepted; won = Converted; lost =
//     Rejected/Closed.
//   • offers.agent_fee is the agency's own revenue line; transfer_fee is
//     the deal headline value.
//   • contracts.total_commission was migrated to TEXT (encrypted cols,
//     migration 010) — guard with a numeric regex before ::NUMERIC, the
//     same pattern finance.service.getFinancialDashboard uses.
//   • contracts.status enum includes 'Draft' — "signed" excludes 'Draft'.
//   • No soft-delete on any involved table — never add deleted_at filters.
//
// This module is DESCRIPTIVE ONLY by design — no forecasting/prediction.
// ──────────────────────────────────────────────────────────────

const P = `${CachePrefix.DASHBOARD}:sales`;

// Offer status groupings — kept in one place so every query agrees.
const OPEN_STATUSES = "('New', 'Under Review', 'Negotiation', 'Accepted')";
const LOST_STATUSES = "('Rejected', 'Closed')";

// ── Types ──

export interface SalesFunnel {
  totalOffers: number;
  openOffers: number;
  inNegotiation: number;
  wonOffers: number;
  lostOffers: number;
  contractsSigned: number;
  contractsTotal: number;
  /** Won / (Won + Lost), as a 0–100 percentage. null when no closed deals. */
  winRate: number | null;
  /** Offers that produced a contract / total offers, 0–100. null when none. */
  conversionRate: number | null;
  /** Mean days from submission to close (won or lost). null when none. */
  avgDaysToClose: number | null;
}

export interface PipelineStageBucket {
  key: string;
  count: number;
  transferValue: number;
  agentValue: number;
}

export interface SalesPipeline {
  /** Open offers only, broken down by status. */
  byStatus: PipelineStageBucket[];
  /** Open offers only, broken down by negotiation phase. */
  byPhase: PipelineStageBucket[];
  /** Totals across all open offers. */
  openCount: number;
  totalTransferValue: number;
  totalAgentValue: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  commission: number;
}

export interface SalesRevenue {
  expectedCommission: number;
  collectedCommission: number;
  outstandingCommission: number;
  /** Monthly collected revenue/commission for the requested window. */
  trend: RevenuePoint[];
}

export interface RepPerformance {
  repId: string;
  repName: string | null;
  totalOffers: number;
  won: number;
  wonValue: number;
}

export interface ClubDealStats {
  clubId: string;
  clubName: string | null;
  clubNameAr: string | null;
  logoUrl: string | null;
  offerCount: number;
  transferValue: number;
  agentValue: number;
}

export interface SalesAll {
  funnel: SalesFunnel;
  pipeline: SalesPipeline;
  revenue: SalesRevenue;
  repPerformance: RepPerformance[];
  topClubs: ClubDealStats[];
}

// ── Helpers ──

/** Safe percentage (0–100, rounded to 1dp). Returns null when denom is 0. */
function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function toPipelineBuckets(
  rows: {
    key: string | null;
    count: number | string;
    transfer_value: number | string;
    agent_value: number | string;
  }[],
  nullLabel: string,
): PipelineStageBucket[] {
  return rows.map((r) => ({
    key: r.key == null || r.key === "" ? nullLabel : r.key,
    count: Number(r.count),
    transferValue: Number(r.transfer_value),
    agentValue: Number(r.agent_value),
  }));
}

// ── Funnel ──

/** Offer→contract conversion funnel with win rate and deal velocity. */
export async function getFunnel(): Promise<SalesFunnel> {
  return cacheOrFetch(
    `${P}:funnel`,
    async () => {
      const [offerRow] = await sequelize.query<{
        total_offers: number;
        open_offers: number;
        in_negotiation: number;
        won_offers: number;
        lost_offers: number;
        converted_to_contract: number;
        avg_days_to_close: string | null;
      }>(
        `SELECT
           COUNT(*)::INT AS total_offers,
           COUNT(*) FILTER (WHERE status::TEXT IN ${OPEN_STATUSES})::INT AS open_offers,
           COUNT(*) FILTER (WHERE status::TEXT = 'Negotiation')::INT AS in_negotiation,
           COUNT(*) FILTER (WHERE status::TEXT = 'Converted')::INT AS won_offers,
           COUNT(*) FILTER (WHERE status::TEXT IN ${LOST_STATUSES})::INT AS lost_offers,
           COUNT(*) FILTER (WHERE converted_contract_id IS NOT NULL)::INT AS converted_to_contract,
           AVG(EXTRACT(EPOCH FROM (COALESCE(converted_at, closed_at) - submitted_at)) / 86400.0)
             FILTER (WHERE COALESCE(converted_at, closed_at) IS NOT NULL AND submitted_at IS NOT NULL)
             AS avg_days_to_close
         FROM offers`,
        { type: QueryTypes.SELECT },
      );

      const [contractRow] = await sequelize.query<{
        contracts_signed: number;
        contracts_total: number;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE status::TEXT <> 'Draft')::INT AS contracts_signed,
           COUNT(*)::INT AS contracts_total
         FROM contracts`,
        { type: QueryTypes.SELECT },
      );

      const totalOffers = offerRow?.total_offers ?? 0;
      const wonOffers = offerRow?.won_offers ?? 0;
      const lostOffers = offerRow?.lost_offers ?? 0;
      const convertedToContract = offerRow?.converted_to_contract ?? 0;

      return {
        totalOffers,
        openOffers: offerRow?.open_offers ?? 0,
        inNegotiation: offerRow?.in_negotiation ?? 0,
        wonOffers,
        lostOffers,
        contractsSigned: contractRow?.contracts_signed ?? 0,
        contractsTotal: contractRow?.contracts_total ?? 0,
        winRate: pct(wonOffers, wonOffers + lostOffers),
        conversionRate: pct(convertedToContract, totalOffers),
        avgDaysToClose:
          offerRow?.avg_days_to_close == null
            ? null
            : Math.round(Number(offerRow.avg_days_to_close) * 10) / 10,
      };
    },
    CacheTTL.MEDIUM,
  );
}

// ── Pipeline ──

/** Open-offer pipeline value, broken down by status and by phase. */
export async function getPipeline(): Promise<SalesPipeline> {
  return cacheOrFetch(
    `${P}:pipeline`,
    async () => {
      const [byStatusRows, byPhaseRows] = await Promise.all([
        sequelize.query<{
          key: string | null;
          count: number;
          transfer_value: string;
          agent_value: string;
        }>(
          `SELECT
             status::TEXT AS key,
             COUNT(*)::INT AS count,
             COALESCE(SUM(transfer_fee), 0)::NUMERIC AS transfer_value,
             COALESCE(SUM(agent_fee), 0)::NUMERIC AS agent_value
           FROM offers
           WHERE status::TEXT IN ${OPEN_STATUSES}
           GROUP BY status
           ORDER BY CASE status::TEXT
             WHEN 'New' THEN 1 WHEN 'Under Review' THEN 2
             WHEN 'Negotiation' THEN 3 WHEN 'Accepted' THEN 4 ELSE 5 END`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query<{
          key: string | null;
          count: number;
          transfer_value: string;
          agent_value: string;
        }>(
          `SELECT
             phase::TEXT AS key,
             COUNT(*)::INT AS count,
             COALESCE(SUM(transfer_fee), 0)::NUMERIC AS transfer_value,
             COALESCE(SUM(agent_fee), 0)::NUMERIC AS agent_value
           FROM offers
           WHERE status::TEXT IN ${OPEN_STATUSES}
           GROUP BY phase
           ORDER BY CASE phase::TEXT
             WHEN 'ID' THEN 1 WHEN 'Acquire' THEN 2 WHEN 'Map' THEN 3
             WHEN 'Negotiate' THEN 4 WHEN 'Media' THEN 5
             WHEN 'Close' THEN 6 ELSE 7 END`,
          { type: QueryTypes.SELECT },
        ),
      ]);

      const byStatus = toPipelineBuckets(byStatusRows, "Unknown");
      const byPhase = toPipelineBuckets(byPhaseRows, "Unassigned");

      return {
        byStatus,
        byPhase,
        openCount: byStatus.reduce((s, b) => s + b.count, 0),
        totalTransferValue: byStatus.reduce((s, b) => s + b.transferValue, 0),
        totalAgentValue: byStatus.reduce((s, b) => s + b.agentValue, 0),
      };
    },
    CacheTTL.MEDIUM,
  );
}

// ── Revenue & commissions ──

/** Commission summary plus a monthly collected-revenue trend. */
export async function getRevenue(months = 12): Promise<SalesRevenue> {
  return cacheOrFetch(
    buildCacheKey(`${P}:revenue`, { months }),
    async () => {
      const [summaryRow] = await sequelize.query<{
        expected_commission: string;
        collected_commission: string;
        outstanding_commission: string;
      }>(
        `SELECT
           (SELECT COALESCE(SUM(
              CASE WHEN total_commission ~ '^[0-9.]+$' THEN total_commission::NUMERIC ELSE 0 END
            ), 0)::NUMERIC
            FROM contracts WHERE status::TEXT IN ('Active', 'Expiring Soon')) AS expected_commission,
           (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments
            WHERE payment_type = 'Commission' AND status = 'Paid') AS collected_commission,
           (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments
            WHERE payment_type = 'Commission' AND status IN ('Expected', 'Overdue')) AS outstanding_commission`,
        { type: QueryTypes.SELECT },
      );

      const trendRows = await sequelize.query<{
        month: string;
        revenue: string;
        commission: string;
      }>(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') AS month,
           SUM(amount)::NUMERIC AS revenue,
           SUM(CASE WHEN payment_type = 'Commission' THEN amount ELSE 0 END)::NUMERIC AS commission
         FROM payments
         WHERE status = 'Paid'
           AND paid_date >= DATE_TRUNC('month', NOW()) - make_interval(months => $1)
         GROUP BY DATE_TRUNC('month', paid_date)
         ORDER BY month ASC`,
        { bind: [months], type: QueryTypes.SELECT },
      );

      return {
        expectedCommission: Number(summaryRow?.expected_commission ?? 0),
        collectedCommission: Number(summaryRow?.collected_commission ?? 0),
        outstandingCommission: Number(summaryRow?.outstanding_commission ?? 0),
        trend: trendRows.map((r) => ({
          month: r.month,
          revenue: Number(r.revenue),
          commission: Number(r.commission),
        })),
      };
    },
    CacheTTL.MEDIUM,
  );
}

// ── Per-rep performance ──

/** Deal performance per user who created offers (top N by wins). */
export async function getRepPerformance(limit = 20): Promise<RepPerformance[]> {
  return cacheOrFetch(
    buildCacheKey(`${P}:rep-performance`, { limit }),
    async () => {
      const rows = await sequelize.query<{
        rep_id: string;
        rep_name: string | null;
        total_offers: number;
        won: number;
        won_value: string;
      }>(
        `SELECT
           u.id AS rep_id,
           u.full_name AS rep_name,
           COUNT(o.id)::INT AS total_offers,
           COUNT(o.id) FILTER (WHERE o.status::TEXT = 'Converted')::INT AS won,
           COALESCE(SUM(o.agent_fee) FILTER (WHERE o.status::TEXT = 'Converted'), 0)::NUMERIC AS won_value
         FROM offers o
         JOIN users u ON o.created_by = u.id
         GROUP BY u.id, u.full_name
         ORDER BY won DESC, total_offers DESC
         LIMIT $1`,
        { bind: [limit], type: QueryTypes.SELECT },
      );

      return rows.map((r) => ({
        repId: r.rep_id,
        repName: r.rep_name,
        totalOffers: Number(r.total_offers),
        won: Number(r.won),
        wonValue: Number(r.won_value),
      }));
    },
    CacheTTL.MEDIUM,
  );
}

// ── Top counterparty clubs ──

/** Clubs we deal with most, ranked by offer volume then headline value. */
export async function getTopClubs(limit = 10): Promise<ClubDealStats[]> {
  return cacheOrFetch(
    buildCacheKey(`${P}:top-clubs`, { limit }),
    async () => {
      const rows = await sequelize.query<{
        club_id: string;
        club_name: string | null;
        club_name_ar: string | null;
        logo_url: string | null;
        offer_count: number;
        transfer_value: string;
        agent_value: string;
      }>(
        `SELECT
           c.id AS club_id,
           c.name AS club_name,
           c.name_ar AS club_name_ar,
           c.logo_url,
           COUNT(o.id)::INT AS offer_count,
           COALESCE(SUM(o.transfer_fee), 0)::NUMERIC AS transfer_value,
           COALESCE(SUM(o.agent_fee), 0)::NUMERIC AS agent_value
         FROM offers o
         JOIN clubs c ON o.to_club_id = c.id
         GROUP BY c.id, c.name, c.name_ar, c.logo_url
         ORDER BY offer_count DESC, transfer_value DESC
         LIMIT $1`,
        { bind: [limit], type: QueryTypes.SELECT },
      );

      return rows.map((r) => ({
        clubId: r.club_id,
        clubName: r.club_name,
        clubNameAr: r.club_name_ar,
        logoUrl: r.logo_url,
        offerCount: Number(r.offer_count),
        transferValue: Number(r.transfer_value),
        agentValue: Number(r.agent_value),
      }));
    },
    CacheTTL.MEDIUM,
  );
}

// ── Batched ──

/** Everything the leadership sales dashboard needs in one round-trip. */
export async function getSalesAll(): Promise<SalesAll> {
  const [funnel, pipeline, revenue, repPerformance, topClubs] =
    await Promise.all([
      getFunnel(),
      getPipeline(),
      getRevenue(),
      getRepPerformance(),
      getTopClubs(),
    ]);

  return { funnel, pipeline, revenue, repPerformance, topClubs };
}
