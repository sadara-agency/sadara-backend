import { QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import ScoutReport, { type Recommendation } from "./scoutReport.model";
import { Watchlist } from "./scouting.model";
import type { UpsertScoutReportDTO } from "./scoutReport.validation";
import { AppError } from "@middleware/errorHandler";

type RatingKey =
  | "pace"
  | "strength"
  | "stamina"
  | "ballControl"
  | "passing"
  | "shooting"
  | "defending"
  | "decisionMaking"
  | "leadership"
  | "workRate"
  | "positioning"
  | "pressingScore"
  | "tacticalAwareness";

const RATING_KEYS: RatingKey[] = [
  "pace",
  "strength",
  "stamina",
  "ballControl",
  "passing",
  "shooting",
  "defending",
  "decisionMaking",
  "leadership",
  "workRate",
  "positioning",
  "pressingScore",
  "tacticalAwareness",
];

export async function listScoutReports(filters: {
  recommendation?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.recommendation) where.recommendation = filters.recommendation;

  const { rows, count } = await ScoutReport.findAndCountAll({
    where,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
    order: [["overallScore", "DESC"]],
  });

  return { data: rows, total: count };
}

export async function getScoutReport(watchlistId: string) {
  const wl = await Watchlist.findByPk(watchlistId);
  if (!wl) throw new AppError("Watchlist entry not found", 404);

  return ScoutReport.findOne({ where: { watchlistId } });
}

export async function upsertScoutReport(
  watchlistId: string,
  data: UpsertScoutReportDTO,
  userId: string,
) {
  const wl = await Watchlist.findByPk(watchlistId);
  if (!wl) throw new AppError("Watchlist entry not found", 404);

  const existing = await ScoutReport.findOne({ where: { watchlistId } });

  // Auto-derive overall score from provided ratings if not explicitly supplied
  const ratings = RATING_KEYS.map((k) => data[k]).filter(
    (v): v is number => typeof v === "number",
  );
  const autoOverall =
    ratings.length > 0
      ? parseFloat(
          (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
        )
      : null;

  const payload = {
    ...data,
    watchlistId,
    authoredBy: userId,
    overallScore: data.overallScore ?? autoOverall,
  };

  if (existing) {
    return existing.update(payload);
  }
  return ScoutReport.create(payload as any);
}

export async function deleteScoutReport(watchlistId: string) {
  const report = await ScoutReport.findOne({ where: { watchlistId } });
  if (!report) throw new AppError("Scout report not found", 404);
  await report.destroy();
  return { watchlistId };
}

type SimilarRow = {
  id: string;
  prospect_name: string;
  prospect_name_ar: string | null;
  position: string | null;
  overall_score: string | null;
  recommendation: string | null;
  similarity: string;
};

export async function getSimilarProspects(watchlistId: string) {
  const target = await ScoutReport.findOne({ where: { watchlistId } });
  if (!target) return [];

  const rows = await sequelize.query<SimilarRow>(
    `SELECT
      w.id,
      w.prospect_name,
      w.prospect_name_ar,
      w.position,
      r.overall_score,
      r.recommendation,
      (
        COALESCE(ABS(r.pace               - :pace), 0) +
        COALESCE(ABS(r.strength           - :strength), 0) +
        COALESCE(ABS(r.stamina            - :stamina), 0) +
        COALESCE(ABS(r.ball_control       - :ballControl), 0) +
        COALESCE(ABS(r.passing            - :passing), 0) +
        COALESCE(ABS(r.shooting           - :shooting), 0) +
        COALESCE(ABS(r.defending          - :defending), 0) +
        COALESCE(ABS(r.decision_making    - :decisionMaking), 0) +
        COALESCE(ABS(r.leadership         - :leadership), 0) +
        COALESCE(ABS(r.work_rate          - :workRate), 0) +
        COALESCE(ABS(r.positioning        - :positioning), 0) +
        COALESCE(ABS(r.pressing_score     - :pressingScore), 0) +
        COALESCE(ABS(r.tactical_awareness - :tacticalAwareness), 0)
      ) AS similarity
    FROM watchlists w
    JOIN scout_report_attributes r ON r.watchlist_id = w.id
    WHERE w.id != :watchlistId
    ORDER BY similarity ASC
    LIMIT 5`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        watchlistId,
        pace: target.pace ?? 5,
        strength: target.strength ?? 5,
        stamina: target.stamina ?? 5,
        ballControl: target.ballControl ?? 5,
        passing: target.passing ?? 5,
        shooting: target.shooting ?? 5,
        defending: target.defending ?? 5,
        decisionMaking: target.decisionMaking ?? 5,
        leadership: target.leadership ?? 5,
        workRate: target.workRate ?? 5,
        positioning: target.positioning ?? 5,
        pressingScore: target.pressingScore ?? 5,
        tacticalAwareness: target.tacticalAwareness ?? 5,
      },
    },
  );

  return rows.map((r) => ({
    id: r.id,
    prospectName: r.prospect_name,
    prospectNameAr: r.prospect_name_ar,
    position: r.position,
    overallScore: r.overall_score ? parseFloat(r.overall_score) : null,
    recommendation: r.recommendation as Recommendation | null,
    similarityScore: parseInt(r.similarity, 10),
  }));
}
