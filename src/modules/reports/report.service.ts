import { QueryTypes } from "sequelize";
import { TechnicalReport } from "@modules/reports/report.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { sequelize } from "@config/database";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  CreateReportInput,
  ReportQuery,
  ReportFilters,
} from "@modules/reports/report.validation";
import { generateReportPdf } from "@modules/reports/report.pdf";
import { logger } from "@config/logger";
import { generateReportFailedTask } from "@modules/reports/reportAutoTasks";

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

export async function listReports(queryParams: ReportQuery) {
  try {
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
  } catch (err: any) {
    logger.error("listReports failed", {
      error: err.message,
      stack: err.stack,
      playerId: queryParams.playerId,
      status: queryParams.status,
    });
    throw new AppError("Failed to list reports", 500);
  }
}

// ────────────────────────────────────────────────────────────
// Get Report by ID
// ────────────────────────────────────────────────────────────
export async function getReportById(id: string) {
  try {
    const report = await TechnicalReport.findByPk(id, {
      include: REPORT_INCLUDES,
    });
    if (!report) throw new AppError("Report not found", 404);
    return report;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error("getReportById failed", {
      error: err.message,
      stack: err.stack,
      reportId: id,
    });
    throw new AppError("Failed to retrieve report", 500);
  }
}

// ────────────────────────────────────────────────────────────
// Create & Generate Technical Report
// ────────────────────────────────────────────────────────────
export async function createReport(
  input: CreateReportInput,
  createdBy: string,
) {
  let player: Player | null;
  try {
    player = await Player.findByPk(input.playerId, {
      include: [
        {
          model: Club,
          as: "club",
          attributes: ["id", "name", "nameAr", "logoUrl"],
        },
      ],
    });
  } catch (err: any) {
    logger.error("Failed to find player for report", {
      error: err.message,
      stack: err.stack,
      playerId: input.playerId,
    });
    throw new AppError("Failed to find player. Please try again.", 500);
  }
  if (!player) throw new AppError("Player not found", 404);

  let report: TechnicalReport;
  try {
    report = await TechnicalReport.create({
      playerId: input.playerId,
      title: input.title,
      periodType: input.periodType,
      periodParams: input.periodParams,
      notes: input.notes || null,
      status: "Generating",
      createdBy,
    });
  } catch (err: any) {
    logger.error("Failed to create report record", {
      error: err.message,
      stack: err.stack,
      detail: err.original?.message || err.parent?.message,
      sql: err.sql,
    });
    throw new AppError(
      `Failed to create report: ${err.original?.message || err.message}`,
      500,
    );
  }

  // Fire-and-forget PDF generation — don't block the API response
  generatePdfInBackground(report.id, player, input, createdBy);

  return getReportById(report.id);
}

/** Async PDF generation — runs in background after API responds */
async function generatePdfInBackground(
  reportId: string,
  player: Player,
  input: CreateReportInput,
  createdBy: string,
) {
  try {
    const data = await gatherReportData(
      input.playerId,
      input.periodType,
      input.periodParams,
    );
    const filePath = await generateReportPdf(reportId, player, data);
    await TechnicalReport.update(
      { status: "Generated", filePath },
      { where: { id: reportId } },
    );
  } catch (err: any) {
    logger.error("Report PDF generation failed", {
      error: err.message,
      stack: err.stack,
      reportId,
    });
    try {
      await TechnicalReport.update(
        { status: "Failed", notes: `Generation error: ${err.message}` },
        { where: { id: reportId } },
      );
    } catch (updateErr: any) {
      logger.error("Failed to update report status to Failed", {
        error: updateErr.message,
        reportId,
      });
    }

    // Auto-task: report failed → Creator (fire-and-forget)
    generateReportFailedTask(reportId, createdBy).catch((e) =>
      logger.warn("Auto-task report_generation_failed failed", {
        error: (e as Error).message,
      }),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Delete Report
// ────────────────────────────────────────────────────────────
export async function deleteReport(id: string) {
  try {
    const report = await TechnicalReport.findByPk(id);
    if (!report) throw new AppError("Report not found", 404);
    await report.destroy();
    return { id };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.error("deleteReport failed", {
      error: err.message,
      stack: err.stack,
      reportId: id,
    });
    throw new AppError("Failed to delete report", 500);
  }
}

// ────────────────────────────────────────────────────────────
// Gather report data: player profile + match stats + injuries
// ────────────────────────────────────────────────────────────
export async function gatherReportData(
  playerId: string,
  periodType: string,
  periodParams: Record<string, any>,
) {
  // buildDateFilter returns { clause, binds } with $N starting at startIdx
  const matchDate = buildDateFilter(periodType, periodParams, 2);
  const matchBinds = [playerId, ...matchDate.binds];

  // For injuries, rebuild with i.injury_date instead of m.match_date
  const injuryDateClause = matchDate.clause.replace(
    /m\.match_date/g,
    "i.injury_date",
  );

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
     WHERE pms.player_id = $1 ${matchDate.clause}`,
    { bind: matchBinds, type: QueryTypes.SELECT },
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
     WHERE pms.player_id = $1 ${matchDate.clause}
     ORDER BY m.match_date DESC
     LIMIT 200`,
    { bind: matchBinds, type: QueryTypes.SELECT },
  );

  // ── Injury history ──
  const injuries = await sequelize.query<any>(
    `SELECT i.injury_type, i.injury_type_ar, i.body_part, i.body_part_ar,
            i.severity, i.status, i.injury_date, i.actual_return_date,
            i.days_out, i.is_surgery_required
     FROM injuries i
     WHERE i.player_id = $1 ${injuryDateClause}
     ORDER BY i.injury_date DESC`,
    { bind: matchBinds, type: QueryTypes.SELECT },
  );

  return { profile, statsAgg, matchList, injuries };
}

// ════════════════════════════════════════════════════════════
// PREDEFINED REPORTS (PRD Section 12)
// ════════════════════════════════════════════════════════════

/** Build parameterized WHERE fragments. Returns { clauses, binds, nextIdx }. */
function buildSafeWhere(
  filters: ReportFilters,
  dateCol: string,
  tableAlias: string,
  startIdx = 1,
) {
  const clauses: string[] = [];
  const binds: any[] = [];
  let idx = startIdx;
  if (filters.dateFrom) {
    clauses.push(`${dateCol} >= $${idx++}`);
    binds.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push(`${dateCol} <= $${idx++}`);
    binds.push(filters.dateTo);
  }
  if (filters.playerId) {
    clauses.push(`${tableAlias}.player_id = $${idx++}`);
    binds.push(filters.playerId);
  }
  if (filters.clubId) {
    clauses.push(`${tableAlias}.club_id = $${idx++}`);
    binds.push(filters.clubId);
  }
  return {
    clause: clauses.length ? "AND " + clauses.join(" AND ") : "",
    binds,
    nextIdx: idx,
  };
}

// ── Player Portfolio Report ──
export async function getPlayerPortfolioReport(filters: ReportFilters) {
  try {
    const clauses: string[] = ["p.status = 'active'"];
    const binds: any[] = [];
    let idx = 1;
    if (filters.playerId) {
      clauses.push(`p.id = $${idx++}`);
      binds.push(filters.playerId);
    }
    if (filters.clubId) {
      clauses.push(`p.current_club_id = $${idx++}`);
      binds.push(filters.clubId);
    }

    const players = await sequelize.query<any>(
      `SELECT p.id, p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
              p.position, p.player_type, p.contract_type, p.market_value,
              p.status, p.date_of_birth, p.nationality, p.photo_url,
              c.name AS club_name, c.name_ar AS club_name_ar
       FROM players p
       LEFT JOIN clubs c ON p.current_club_id = c.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY p.market_value DESC NULLS LAST
       LIMIT 500`,
      { bind: binds, type: QueryTypes.SELECT },
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
  } catch (err: any) {
    logger.error("getPlayerPortfolioReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError("Failed to generate Player Portfolio report", 500);
  }
}

// ── Contract & Commission Report ──
export async function getContractCommissionReport(filters: ReportFilters) {
  try {
    const {
      clause: extra,
      binds,
      nextIdx,
    } = buildSafeWhere(filters, "c.start_date", "c");
    let idx = nextIdx;
    let pctFilter = "";
    if (filters.playerContractType) {
      pctFilter = `AND c.player_contract_type = $${idx++}`;
      binds.push(filters.playerContractType);
    }

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
       ORDER BY c.end_date ASC
       LIMIT 500`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    const [summary] = await sequelize.query<any>(
      `SELECT
         COUNT(*)::INT AS active_contracts,
         COALESCE(SUM(CASE WHEN total_commission ~ '^[0-9.]+$' THEN total_commission::NUMERIC ELSE 0 END), 0) AS total_expected_commission,
         COALESCE(SUM(CASE WHEN base_salary ~ '^[0-9.]+$' THEN base_salary::NUMERIC ELSE 0 END), 0) AS total_base_salary
       FROM contracts
       WHERE status IN ('Active', 'Expiring Soon')`,
      { type: QueryTypes.SELECT },
    );

    return { summary, contracts };
  } catch (err: any) {
    logger.error("getContractCommissionReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError("Failed to generate Contract & Commission report", 500);
  }
}

// ── Injury Summary Report ──
export async function getInjurySummaryReport(filters: ReportFilters) {
  try {
    const clauses: string[] = [];
    const binds: any[] = [];
    let idx = 1;
    if (filters.dateFrom) {
      clauses.push(`i.injury_date >= $${idx++}`);
      binds.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      clauses.push(`i.injury_date <= $${idx++}`);
      binds.push(filters.dateTo);
    }
    if (filters.playerId) {
      clauses.push(`i.player_id = $${idx++}`);
      binds.push(filters.playerId);
    }
    const whereExtra = clauses.length ? "AND " + clauses.join(" AND ") : "";

    const byBodyPart = await sequelize.query<any>(
      `SELECT i.body_part, COUNT(*)::INT AS count,
              ROUND(AVG(i.days_out))::INT AS avg_days_out
       FROM injuries i
       WHERE 1=1 ${whereExtra}
       GROUP BY i.body_part
       ORDER BY count DESC`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    const bySeverity = await sequelize.query<any>(
      `SELECT i.severity, COUNT(*)::INT AS count
       FROM injuries i
       WHERE 1=1 ${whereExtra}
       GROUP BY i.severity
       ORDER BY count DESC`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    const [summary] = await sequelize.query<any>(
      `SELECT
         COUNT(*)::INT AS total_injuries,
         COUNT(*) FILTER (WHERE status = 'UnderTreatment')::INT AS active_injuries,
         ROUND(AVG(days_out))::INT AS avg_days_out,
         COUNT(*) FILTER (WHERE is_surgery_required = true)::INT AS surgeries
       FROM injuries i
       WHERE 1=1 ${whereExtra}`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    return { summary, byBodyPart, bySeverity };
  } catch (err: any) {
    logger.error("getInjurySummaryReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError("Failed to generate Injury Summary report", 500);
  }
}

// ── Match & Tasks Report ──
export async function getMatchTasksReport(filters: ReportFilters) {
  try {
    const clauses: string[] = [];
    const binds: any[] = [];
    let idx = 1;
    if (filters.dateFrom) {
      clauses.push(`m.match_date >= $${idx++}`);
      binds.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      clauses.push(`m.match_date <= $${idx++}`);
      binds.push(filters.dateTo);
    }
    if (filters.clubId) {
      clauses.push(`(m.home_club_id = $${idx} OR m.away_club_id = $${idx})`);
      binds.push(filters.clubId);
      idx++;
    }
    const whereExtra = clauses.length ? "AND " + clauses.join(" AND ") : "";

    const matches = await sequelize.query<any>(
      `SELECT m.id, m.match_date, m.competition, m.status,
              m.home_score, m.away_score,
              hc.name AS home_club, hc.name_ar AS home_club_ar,
              ac.name AS away_club, ac.name_ar AS away_club_ar,
              COALESCE(tc.total_tasks, 0) AS total_tasks,
              COALESCE(tc.completed_tasks, 0) AS completed_tasks
       FROM matches m
       LEFT JOIN clubs hc ON m.home_club_id = hc.id
       LEFT JOIN clubs ac ON m.away_club_id = ac.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::INT AS total_tasks,
                COUNT(*) FILTER (WHERE t.status = 'Completed')::INT AS completed_tasks
         FROM tasks t WHERE t.match_id = m.id
       ) tc ON true
       WHERE 1=1 ${whereExtra}
       ORDER BY m.match_date DESC
       LIMIT 500`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    const [summary] = await sequelize.query<any>(
      `SELECT
         COUNT(*)::INT AS total_matches,
         COUNT(*) FILTER (WHERE status = 'upcoming')::INT AS upcoming,
         COUNT(*) FILTER (WHERE status = 'completed')::INT AS completed
       FROM matches m
       WHERE 1=1 ${whereExtra}`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    return { summary, matches };
  } catch (err: any) {
    logger.error("getMatchTasksReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError("Failed to generate Match & Tasks report", 500);
  }
}

// ── Financial Summary Report ──
export async function getFinancialSummaryReport(filters: ReportFilters) {
  try {
    const binds: any[] = [];
    let playerFilter = "";
    if (filters.playerId) {
      playerFilter = "AND p.id = $1";
      binds.push(filters.playerId);
    }

    const [overview] = await sequelize.query<any>(
      `SELECT
         COALESCE(SUM(p.market_value), 0)::NUMERIC AS total_market_value,
         (SELECT COALESCE(SUM(CASE WHEN total_commission ~ '^[0-9.]+$' THEN total_commission::NUMERIC ELSE 0 END), 0) FROM contracts WHERE status IN ('Active', 'Expiring Soon')) AS expected_commissions,
         (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments WHERE status = 'Paid') AS collected_revenue,
         (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM payments WHERE status IN ('Expected', 'Overdue')) AS outstanding_revenue
       FROM players p
       WHERE p.status = 'active' ${playerFilter}`,
      { bind: binds, type: QueryTypes.SELECT },
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
      { bind: binds, type: QueryTypes.SELECT },
    );

    return { overview, topPlayers };
  } catch (err: any) {
    logger.error("getFinancialSummaryReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError("Failed to generate Financial Summary report", 500);
  }
}

// ── Build date filter clause based on period type (parameterized) ──
// Returns { clause, binds } — caller must merge binds into their query.
// startIdx = next available $N position in the caller's query (after playerId = $1).
function buildDateFilter(
  periodType: string,
  params: Record<string, any>,
  startIdx = 2,
): { clause: string; binds: any[] } {
  switch (periodType) {
    case "DateRange":
      if (params.startDate && params.endDate) {
        return {
          clause: `AND m.match_date >= $${startIdx} AND m.match_date <= $${startIdx + 1}`,
          binds: [params.startDate, params.endDate],
        };
      }
      return { clause: "", binds: [] };
    case "Season":
      if (params.season) {
        const [startYear] = params.season.split("-");
        const seasonStart = `${startYear}-08-01`;
        const seasonEnd = `${Number(startYear) + 1}-07-31`;
        return {
          clause: `AND m.match_date >= $${startIdx} AND m.match_date <= $${startIdx + 1}`,
          binds: [seasonStart, seasonEnd],
        };
      }
      return { clause: "", binds: [] };
    case "LastNMatches":
      return { clause: "", binds: [] };
    default:
      return { clause: "", binds: [] };
  }
}

// ── Scouting Pipeline Report ──
export async function getScoutingPipelineReport(filters: ReportFilters) {
  try {
    const clauses: string[] = [];
    const binds: any[] = [];
    let idx = 1;
    if (filters.dateFrom) {
      clauses.push(`w.created_at >= $${idx++}`);
      binds.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      clauses.push(`w.created_at <= $${idx++}`);
      binds.push(filters.dateTo);
    }
    const whereExtra = clauses.length ? "AND " + clauses.join(" AND ") : "";

    const prospects = await sequelize.query<any>(
      `SELECT w.id, w.prospect_name, w.prospect_name_ar, w.position,
              w.current_club, w.current_league, w.status, w.priority,
              w.technical_rating, w.physical_rating, w.mental_rating, w.potential_rating,
              sc.case_number, sc.status AS screening_status, sc.identity_check,
              sd.decision, sd.decision_date
       FROM watchlists w
       LEFT JOIN screening_cases sc ON sc.watchlist_id = w.id
       LEFT JOIN selection_decisions sd ON sd.screening_case_id = sc.id
       WHERE 1=1 ${whereExtra}
       ORDER BY w.created_at DESC
       LIMIT 500`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    const [summary] = await sequelize.query<any>(
      `SELECT
         COUNT(DISTINCT w.id)::INT AS total_watchlist,
         COUNT(DISTINCT w.id) FILTER (WHERE w.status = 'Shortlisted')::INT AS shortlisted,
         COUNT(DISTINCT sc.id) FILTER (WHERE sc.status = 'InProgress')::INT AS screening_in_progress,
         COUNT(DISTINCT sd.id) FILTER (WHERE sd.decision = 'Approved')::INT AS approved,
         COUNT(DISTINCT sd.id) FILTER (WHERE sd.decision = 'Rejected')::INT AS rejected
       FROM watchlists w
       LEFT JOIN screening_cases sc ON sc.watchlist_id = w.id
       LEFT JOIN selection_decisions sd ON sd.screening_case_id = sc.id
       WHERE 1=1 ${whereExtra}`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    return { summary, prospects };
  } catch (err: any) {
    logger.error("getScoutingPipelineReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError("Failed to generate Scouting Pipeline report", 500);
  }
}

// ── Upcoming Matches & Tasks Report ──
export async function getUpcomingMatchesTasksReport(filters: ReportFilters) {
  try {
    const clauses: string[] = [
      "(m.status = 'upcoming' OR m.match_date >= CURRENT_DATE)",
    ];
    const binds: any[] = [];
    let idx = 1;
    if (filters.dateFrom) {
      clauses.push(`m.match_date >= $${idx++}`);
      binds.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      clauses.push(`m.match_date <= $${idx++}`);
      binds.push(filters.dateTo);
    }
    if (filters.clubId) {
      clauses.push(`(m.home_club_id = $${idx} OR m.away_club_id = $${idx})`);
      binds.push(filters.clubId);
      idx++;
    }
    const whereClause = clauses.join(" AND ");

    const matches = await sequelize.query<any>(
      `SELECT m.id, m.match_date, m.competition, m.venue, m.status,
              hc.name AS home_club, hc.name_ar AS home_club_ar,
              ac.name AS away_club, ac.name_ar AS away_club_ar,
              COALESCE(tc.total_tasks, 0) AS total_tasks,
              COALESCE(tc.completed_tasks, 0) AS completed_tasks,
              COALESCE(tc.open_tasks, 0) AS open_tasks,
              COALESCE(tc.overdue_tasks, 0) AS overdue_tasks,
              CASE WHEN COALESCE(tc.total_tasks, 0) = 0 THEN 0
                   ELSE ROUND(COALESCE(tc.completed_tasks, 0)::NUMERIC * 100.0 / tc.total_tasks, 1)
              END AS completion_rate
       FROM matches m
       LEFT JOIN clubs hc ON m.home_club_id = hc.id
       LEFT JOIN clubs ac ON m.away_club_id = ac.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::INT AS total_tasks,
                COUNT(*) FILTER (WHERE t.status = 'Completed')::INT AS completed_tasks,
                COUNT(*) FILTER (WHERE t.status IN ('Open', 'InProgress'))::INT AS open_tasks,
                COUNT(*) FILTER (WHERE t.status NOT IN ('Completed', 'Canceled') AND t.due_date < CURRENT_DATE)::INT AS overdue_tasks
         FROM tasks t WHERE t.match_id = m.id
       ) tc ON true
       WHERE ${whereClause}
       ORDER BY m.match_date ASC
       LIMIT 500`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    const matchIds = matches.map((m: any) => m.id);

    const tasks =
      matchIds.length > 0
        ? await sequelize.query<any>(
            `SELECT t.title, t.type, t.priority, t.status, t.due_date, t.is_auto_created,
                  u.full_name AS assigned_to_name,
                  COALESCE(p.first_name || ' ' || p.last_name, '') AS player_name,
                  COALESCE(hc.name, m.home_team_name, '') || ' vs ' || COALESCE(ac.name, m.away_team_name, '') || ' (' || TO_CHAR(m.match_date, 'YYYY-MM-DD') || ')' AS match_label
           FROM tasks t
           LEFT JOIN users u ON t.assigned_to = u.id
           LEFT JOIN players p ON t.player_id = p.id
           LEFT JOIN matches m ON t.match_id = m.id
           LEFT JOIN clubs hc ON m.home_club_id = hc.id
           LEFT JOIN clubs ac ON m.away_club_id = ac.id
           WHERE t.match_id = ANY($1::UUID[])
           ORDER BY t.due_date ASC NULLS LAST, t.priority DESC`,
            { bind: [matchIds], type: QueryTypes.SELECT },
          )
        : [];

    // Use CTE to compute summary in a single pass instead of repeated nested subqueries
    const [summary] = await sequelize.query<any>(
      `WITH filtered_matches AS (
         SELECT m.id FROM matches m WHERE ${whereClause}
       ),
       task_stats AS (
         SELECT
           COUNT(*)::INT AS total_tasks,
           COUNT(*) FILTER (WHERE t.status = 'Completed')::INT AS completed_tasks,
           COUNT(*) FILTER (WHERE t.status IN ('Open', 'InProgress'))::INT AS pending_tasks,
           COUNT(*) FILTER (WHERE t.status NOT IN ('Completed', 'Canceled') AND t.due_date < CURRENT_DATE)::INT AS overdue_tasks
         FROM tasks t
         WHERE t.match_id IN (SELECT id FROM filtered_matches)
       )
       SELECT
         (SELECT COUNT(*)::INT FROM filtered_matches) AS total_upcoming_matches,
         COALESCE(ts.total_tasks, 0) AS total_tasks,
         COALESCE(ts.completed_tasks, 0) AS completed_tasks,
         COALESCE(ts.pending_tasks, 0) AS pending_tasks,
         COALESCE(ts.overdue_tasks, 0) AS overdue_tasks,
         CASE WHEN COALESCE(ts.total_tasks, 0) = 0 THEN 0
              ELSE ROUND(ts.completed_tasks::NUMERIC * 100.0 / ts.total_tasks, 1)
         END AS avg_completion_rate
       FROM task_stats ts`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    return { summary, matches, tasks };
  } catch (err: any) {
    logger.error("getUpcomingMatchesTasksReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError(
      "Failed to generate Upcoming Matches & Tasks report",
      500,
    );
  }
}

// ── Expiring Contracts Report ──
export async function getExpiringContractsReport(filters: ReportFilters) {
  try {
    const window = Math.min(
      Math.max(Number(filters.expiryWindow) || 90, 1),
      365,
    );

    const clauses: string[] = [
      "c.status IN ('Active', 'Expiring Soon')",
      "c.end_date >= CURRENT_DATE",
      `c.end_date <= CURRENT_DATE + INTERVAL '${window} days'`,
    ];
    const binds: any[] = [];
    let idx = 1;
    if (filters.playerId) {
      clauses.push(`c.player_id = $${idx++}`);
      binds.push(filters.playerId);
    }
    if (filters.clubId) {
      clauses.push(`c.club_id = $${idx++}`);
      binds.push(filters.clubId);
    }
    if (filters.playerContractType) {
      clauses.push(`c.player_contract_type = $${idx++}`);
      binds.push(filters.playerContractType);
    }

    const contracts = await sequelize.query<any>(
      `SELECT c.id, c.title, c.status, c.start_date, c.end_date,
              c.base_salary, c.salary_currency, c.player_contract_type,
              (c.end_date - CURRENT_DATE)::INT AS days_remaining,
              p.first_name, p.last_name, p.first_name_ar, p.last_name_ar,
              cl.name AS club_name, cl.name_ar AS club_name_ar
       FROM contracts c
       LEFT JOIN players p ON c.player_id = p.id
       LEFT JOIN clubs cl ON c.club_id = cl.id
       WHERE ${clauses.join(" AND ")}
       ORDER BY c.end_date ASC
       LIMIT 500`,
      { bind: binds, type: QueryTypes.SELECT },
    );

    const [summary] = await sequelize.query<any>(
      `SELECT
         COUNT(*) FILTER (WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::INT AS expiring_30,
         COUNT(*) FILTER (WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days')::INT AS expiring_60,
         COUNT(*) FILTER (WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days')::INT AS expiring_90,
         COALESCE(SUM(CASE WHEN c.base_salary ~ '^[0-9.]+$' THEN c.base_salary::NUMERIC ELSE 0 END) FILTER (WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${window} days'), 0) AS salary_at_risk
       FROM contracts c
       WHERE c.status IN ('Active', 'Expiring Soon')
         AND c.end_date >= CURRENT_DATE`,
      { type: QueryTypes.SELECT },
    );

    return { summary, contracts };
  } catch (err: any) {
    logger.error("getExpiringContractsReport failed", {
      error: err.message,
      stack: err.stack,
    });
    throw new AppError("Failed to generate Expiring Contracts report", 500);
  }
}
