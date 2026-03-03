import { QueryTypes } from "sequelize";
import { TechnicalReport } from "./report.model";
import { Player } from "../players/player.model";
import { Club } from "../clubs/club.model";
import { sequelize } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { parsePagination, buildMeta } from "../../shared/utils/pagination";
import { CreateReportInput } from "./report.schema";
import { generateReportPdf } from "./report.pdf";

// ── Shared includes ──
const REPORT_INCLUDES = [
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
];

// ────────────────────────────────────────────────────────────
// List Reports
// ────────────────────────────────────────────────────────────
export async function listReports(queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, "createdAt");

  const where: any = {};
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.status) where.status = queryParams.status;

  const { count, rows } = await TechnicalReport.findAndCountAll({
    where,
    include: REPORT_INCLUDES,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ────────────────────────────────────────────────────────────
// Get Report by ID
// ────────────────────────────────────────────────────────────
export async function getReportById(id: string) {
  const report = await TechnicalReport.findByPk(id, {
    include: REPORT_INCLUDES,
  });
  if (!report) throw new AppError("Report not found", 404);
  return report;
}

// ────────────────────────────────────────────────────────────
// Create & Generate Technical Report
// ────────────────────────────────────────────────────────────
export async function createReport(
  input: CreateReportInput,
  createdBy: string,
) {
  const player = await Player.findByPk(input.playerId, {
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
    ],
  });
  if (!player) throw new AppError("Player not found", 404);

  const report = await TechnicalReport.create({
    playerId: input.playerId,
    title: input.title,
    periodType: input.periodType,
    periodParams: input.periodParams,
    notes: input.notes || null,
    createdBy,
  });

  // Set to Generating — async PDF work
  await report.update({ status: "Generating" });

  try {
    const data = await gatherReportData(
      input.playerId,
      input.periodType,
      input.periodParams,
    );
    const filePath = await generateReportPdf(report.id, player, data);
    await report.update({ status: "Generated", filePath });
  } catch (err: any) {
    console.error("Report generation failed:", err.message);
    await report.update({
      status: "Failed",
      notes: `Generation error: ${err.message}`,
    });
  }

  return getReportById(report.id);
}

// ────────────────────────────────────────────────────────────
// Delete Report
// ────────────────────────────────────────────────────────────
export async function deleteReport(id: string) {
  const report = await TechnicalReport.findByPk(id);
  if (!report) throw new AppError("Report not found", 404);
  await report.destroy();
  return { id };
}

// ────────────────────────────────────────────────────────────
// Gather report data: player profile + match stats + injuries
// ────────────────────────────────────────────────────────────
export async function gatherReportData(
  playerId: string,
  periodType: string,
  periodParams: Record<string, any>,
) {
  const dateFilter = buildDateFilter(periodType, periodParams);

  // ── Player profile ──
  const [profile] = await sequelize.query<any>(
    `SELECT p.*,
            c.name AS club_name, c.name_ar AS club_name_ar, c.logo_url AS club_logo_url
     FROM players p
     LEFT JOIN clubs c ON p.current_club_id = c.id
     WHERE p.id = $1`,
    { bind: [playerId], type: QueryTypes.SELECT },
  );

  // ── Aggregated match stats ──
  const [statsAgg] = await sequelize.query<any>(
    `SELECT
       COUNT(*)::INT AS matches_played,
       COALESCE(SUM(pms.minutes_played), 0)::INT AS total_minutes,
       COALESCE(SUM(pms.goals), 0)::INT AS total_goals,
       COALESCE(SUM(pms.assists), 0)::INT AS total_assists,
       COALESCE(SUM(pms.key_passes), 0)::INT AS total_key_passes,
       COALESCE(SUM(pms.shots_total), 0)::INT AS total_shots,
       COALESCE(SUM(pms.shots_on_target), 0)::INT AS total_shots_on_target,
       COALESCE(SUM(pms.passes_total), 0)::INT AS total_passes,
       COALESCE(SUM(pms.passes_completed), 0)::INT AS total_passes_completed,
       COALESCE(SUM(pms.tackles_total), 0)::INT AS total_tackles,
       COALESCE(SUM(pms.interceptions), 0)::INT AS total_interceptions,
       COALESCE(SUM(pms.dribbles_completed), 0)::INT AS total_dribbles,
       COALESCE(SUM(pms.dribbles_attempted), 0)::INT AS total_dribbles_attempted,
       COALESCE(SUM(pms.yellow_cards), 0)::INT AS total_yellow_cards,
       COALESCE(SUM(pms.red_cards), 0)::INT AS total_red_cards,
       ROUND(AVG(pms.rating), 2) AS avg_rating
     FROM player_match_stats pms
     JOIN matches m ON pms.match_id = m.id
     WHERE pms.player_id = $1 ${dateFilter}`,
    { bind: [playerId], type: QueryTypes.SELECT },
  );

  // ── Match list (individual match details) ──
  const matchList = await sequelize.query<any>(
    `SELECT m.match_date, m.competition,
            hc.name AS home_club, ac.name AS away_club,
            hc.name_ar AS home_club_ar, ac.name_ar AS away_club_ar,
            m.home_score, m.away_score,
            pms.minutes_played, pms.goals, pms.assists, pms.rating,
            pms.position_in_match
     FROM player_match_stats pms
     JOIN matches m ON pms.match_id = m.id
     LEFT JOIN clubs hc ON m.home_club_id = hc.id
     LEFT JOIN clubs ac ON m.away_club_id = ac.id
     WHERE pms.player_id = $1 ${dateFilter}
     ORDER BY m.match_date DESC`,
    { bind: [playerId], type: QueryTypes.SELECT },
  );

  // ── Injury history ──
  const injuries = await sequelize.query<any>(
    `SELECT i.injury_type, i.injury_type_ar, i.body_part, i.body_part_ar,
            i.severity, i.status, i.injury_date, i.actual_return_date,
            i.days_out, i.is_surgery_required
     FROM injuries i
     WHERE i.player_id = $1 ${dateFilter.replace(/m\.match_date/g, "i.injury_date")}
     ORDER BY i.injury_date DESC`,
    { bind: [playerId], type: QueryTypes.SELECT },
  );

  return { profile, statsAgg, matchList, injuries };
}

// ════════════════════════════════════════════════════════════
// PREDEFINED REPORTS (PRD Section 12)
// ════════════════════════════════════════════════════════════

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  playerId?: string;
  clubId?: string;
  playerContractType?: string;
}

function buildWhereClause(
  filters: ReportFilters,
  dateCol: string,
  tableAlias: string,
): string {
  const clauses: string[] = [];
  if (filters.dateFrom) clauses.push(`${dateCol} >= '${filters.dateFrom}'`);
  if (filters.dateTo) clauses.push(`${dateCol} <= '${filters.dateTo}'`);
  if (filters.playerId)
    clauses.push(`${tableAlias}.player_id = '${filters.playerId}'`);
  if (filters.clubId)
    clauses.push(`${tableAlias}.club_id = '${filters.clubId}'`);
  return clauses.length ? "AND " + clauses.join(" AND ") : "";
}

// ── Player Portfolio Report ──
export async function getPlayerPortfolioReport(filters: ReportFilters) {
  const where: string[] = ["p.status = 'active'"];
  if (filters.playerId) where.push(`p.id = '${filters.playerId}'`);
  if (filters.clubId) where.push(`p.current_club_id = '${filters.clubId}'`);

  const players = await sequelize.query<any>(
    `SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            p.position, p.player_type, p.contract_type, p.market_value,
            p.status, p.date_of_birth, p.nationality, p.photo_url,
            c.name AS club_name, c.name_ar AS club_name_ar
     FROM players p
     LEFT JOIN clubs c ON p.current_club_id = c.id
     WHERE ${where.join(" AND ")}
     ORDER BY p.market_value DESC NULLS LAST`,
    { type: QueryTypes.SELECT },
  );

  const [summary] = await sequelize.query<any>(
    `SELECT
       COUNT(*)::INT AS total_players,
       COUNT(*) FILTER (WHERE contract_type = 'Professional')::INT AS professional,
       COUNT(*) FILTER (WHERE contract_type = 'Amateur')::INT AS amateur,
       COUNT(*) FILTER (WHERE contract_type = 'Youth')::INT AS youth,
       COALESCE(SUM(market_value), 0)::NUMERIC AS total_market_value
     FROM players WHERE status = 'active'`,
    { type: QueryTypes.SELECT },
  );

  return { summary, players };
}

// ── Contract & Commission Report ──
export async function getContractCommissionReport(filters: ReportFilters) {
  const extra = buildWhereClause(filters, "c.start_date", "c");
  const pctFilter = filters.playerContractType
    ? `AND c.player_contract_type = '${filters.playerContractType}'`
    : "";

  const contracts = await sequelize.query<any>(
    `SELECT c.id, c.title, c.status, c.start_date, c.end_date,
            c.base_salary, c.salary_currency, c.commission_pct, c.total_commission,
            c.player_contract_type,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            cl.name AS club_name, cl.name_ar AS club_name_ar
     FROM contracts c
     LEFT JOIN players p ON c.player_id = p.id
     LEFT JOIN clubs cl ON c.club_id = cl.id
     WHERE c.status IN ('Active', 'Expiring Soon') ${extra} ${pctFilter}
     ORDER BY c.end_date ASC`,
    { type: QueryTypes.SELECT },
  );

  const [summary] = await sequelize.query<any>(
    `SELECT
       COUNT(*)::INT AS active_contracts,
       COALESCE(SUM(total_commission), 0)::NUMERIC AS total_expected_commission,
       COALESCE(SUM(base_salary), 0)::NUMERIC AS total_base_salary
     FROM contracts
     WHERE status IN ('Active', 'Expiring Soon')`,
    { type: QueryTypes.SELECT },
  );

  return { summary, contracts };
}

// ── Injury Summary Report ──
export async function getInjurySummaryReport(filters: ReportFilters) {
  const dateFilter =
    filters.dateFrom && filters.dateTo
      ? `AND i.injury_date >= '${filters.dateFrom}' AND i.injury_date <= '${filters.dateTo}'`
      : "";
  const playerFilter = filters.playerId
    ? `AND i.player_id = '${filters.playerId}'`
    : "";

  const byBodyPart = await sequelize.query<any>(
    `SELECT i.body_part, COUNT(*)::INT AS count,
            ROUND(AVG(i.days_out))::INT AS avg_days_out
     FROM injuries i
     WHERE 1=1 ${dateFilter} ${playerFilter}
     GROUP BY i.body_part
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );

  const bySeverity = await sequelize.query<any>(
    `SELECT i.severity, COUNT(*)::INT AS count
     FROM injuries i
     WHERE 1=1 ${dateFilter} ${playerFilter}
     GROUP BY i.severity
     ORDER BY count DESC`,
    { type: QueryTypes.SELECT },
  );

  const [summary] = await sequelize.query<any>(
    `SELECT
       COUNT(*)::INT AS total_injuries,
       COUNT(*) FILTER (WHERE status = 'UnderTreatment')::INT AS active_injuries,
       ROUND(AVG(days_out))::INT AS avg_days_out,
       COUNT(*) FILTER (WHERE is_surgery_required = true)::INT AS surgeries
     FROM injuries i
     WHERE 1=1 ${dateFilter} ${playerFilter}`,
    { type: QueryTypes.SELECT },
  );

  return { summary, byBodyPart, bySeverity };
}

// ── Match & Tasks Report ──
export async function getMatchTasksReport(filters: ReportFilters) {
  const dateFilter =
    filters.dateFrom && filters.dateTo
      ? `AND m.match_date >= '${filters.dateFrom}' AND m.match_date <= '${filters.dateTo}'`
      : "";
  const clubFilter = filters.clubId
    ? `AND (m.home_club_id = '${filters.clubId}' OR m.away_club_id = '${filters.clubId}')`
    : "";

  const matches = await sequelize.query<any>(
    `SELECT m.id, m.match_date, m.competition, m.status,
            m.home_score, m.away_score,
            hc.name AS home_club, hc.name_ar AS home_club_ar,
            ac.name AS away_club, ac.name_ar AS away_club_ar,
            (SELECT COUNT(*)::INT FROM tasks t WHERE t.match_id = m.id) AS total_tasks,
            (SELECT COUNT(*)::INT FROM tasks t WHERE t.match_id = m.id AND t.status = 'Completed') AS completed_tasks
     FROM matches m
     LEFT JOIN clubs hc ON m.home_club_id = hc.id
     LEFT JOIN clubs ac ON m.away_club_id = ac.id
     WHERE 1=1 ${dateFilter} ${clubFilter}
     ORDER BY m.match_date DESC`,
    { type: QueryTypes.SELECT },
  );

  const [summary] = await sequelize.query<any>(
    `SELECT
       COUNT(*)::INT AS total_matches,
       COUNT(*) FILTER (WHERE status = 'upcoming')::INT AS upcoming,
       COUNT(*) FILTER (WHERE status = 'completed')::INT AS completed
     FROM matches m
     WHERE 1=1 ${dateFilter} ${clubFilter}`,
    { type: QueryTypes.SELECT },
  );

  return { summary, matches };
}

// ── Financial Summary Report ──
export async function getFinancialSummaryReport(filters: ReportFilters) {
  const playerFilter = filters.playerId
    ? `AND p.id = '${filters.playerId}'`
    : "";

  const [overview] = await sequelize.query<any>(
    `SELECT
       COALESCE(SUM(p.market_value), 0)::NUMERIC AS total_market_value,
       (SELECT COALESCE(SUM(total_commission), 0)::NUMERIC FROM contracts WHERE status IN ('Active', 'Expiring Soon')) AS expected_commissions,
       (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments WHERE status = 'Paid') AS collected_revenue,
       (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments WHERE status IN ('Pending', 'Overdue')) AS outstanding_revenue
     FROM players p
     WHERE p.status = 'active' ${playerFilter}`,
    { type: QueryTypes.SELECT },
  );

  const topPlayers = await sequelize.query<any>(
    `SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
            p.market_value, p.market_value_currency, p.position, p.photo_url,
            c.name AS club_name, c.name_ar AS club_name_ar
     FROM players p
     LEFT JOIN clubs c ON p.current_club_id = c.id
     WHERE p.status = 'active' AND p.market_value IS NOT NULL ${playerFilter}
     ORDER BY p.market_value DESC
     LIMIT 10`,
    { type: QueryTypes.SELECT },
  );

  return { overview, topPlayers };
}

// ── Build date filter clause based on period type ──
function buildDateFilter(
  periodType: string,
  params: Record<string, any>,
): string {
  switch (periodType) {
    case "DateRange":
      if (params.startDate && params.endDate) {
        return `AND m.match_date >= '${params.startDate}' AND m.match_date <= '${params.endDate}'`;
      }
      return "";
    case "Season":
      if (params.season) {
        // Season format: "2024-2025" → Aug 1 to Jul 31
        const [startYear] = params.season.split("-");
        return `AND m.match_date >= '${startYear}-08-01' AND m.match_date <= '${Number(startYear) + 1}-07-31'`;
      }
      return "";
    case "LastNMatches":
      // This is handled by LIMIT in a subquery — return empty and use match list length
      return "";
    default:
      return "";
  }
}
