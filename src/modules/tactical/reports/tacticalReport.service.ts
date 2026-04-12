import { TacticalReport } from "./tacticalReport.model";
import { TacticalKpi } from "@modules/tactical/kpis/tacticalKpi.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateTacticalReportInput,
  UpdateTacticalReportInput,
  TacticalReportQuery,
} from "./tacticalReport.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function reportIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    {
      model: User,
      as: "analyst",
      attributes: [...USER_ATTRS],
      required: false,
    },
  ];
}

// ── List ──

export async function listTacticalReports(query: TacticalReportQuery) {
  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.analystId) where.analystId = query.analystId;
  if (query.status) where.status = query.status;
  if (query.month) where.month = query.month;
  if (query.year) where.year = query.year;

  const offset = (query.page - 1) * query.limit;
  const { rows, count } = await TacticalReport.findAndCountAll({
    where,
    order: [
      ["year", "DESC"],
      ["month", "DESC"],
    ],
    limit: query.limit,
    offset,
    include: reportIncludes(),
    distinct: true,
  });

  return {
    data: rows,
    meta: {
      total: count,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(count / query.limit),
    },
  };
}

// ── Get by ID ──

export async function getTacticalReportById(id: string) {
  const record = await TacticalReport.findByPk(id, {
    include: reportIncludes(),
  });
  if (!record) throw new AppError("Tactical report not found", 404);
  return record;
}

// ── Create ──

export async function createTacticalReport(
  body: CreateTacticalReportInput,
  userId: string,
) {
  const record = await TacticalReport.create({
    ...body,
    analystId: body.analystId ?? userId,
  });
  return getTacticalReportById(record.id);
}

// ── Update ──

export async function updateTacticalReport(
  id: string,
  body: UpdateTacticalReportInput,
) {
  const record = await TacticalReport.findByPk(id);
  if (!record) throw new AppError("Tactical report not found", 404);
  await record.update(body);
  return getTacticalReportById(id);
}

// ── Delete ──

export async function deleteTacticalReport(id: string) {
  const record = await TacticalReport.findByPk(id);
  if (!record) throw new AppError("Tactical report not found", 404);
  await record.destroy();
  return { id };
}

// ── Publish ──

export async function publishTacticalReport(id: string) {
  const record = await TacticalReport.findByPk(id);
  if (!record) throw new AppError("Tactical report not found", 404);
  if (record.status === "published") {
    throw new AppError("Report is already published", 409);
  }
  await record.update({ status: "published" });
  return getTacticalReportById(id);
}

// ── Auto-generate from KPI data ──

export async function autoGenerateMonthlyReport(
  playerId: string,
  month: number,
  year: number,
  analystId: string,
): Promise<TacticalReport> {
  // Pull KPIs for the player in this month/year
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const kpis = await TacticalKpi.findAll({
    where: { playerId },
    include: [
      {
        model: require("@modules/matches/match.model").Match,
        as: "match",
        where: {
          matchDate: { $gte: startDate, $lte: endDate },
        },
        required: true,
        attributes: ["id", "matchDate"],
      },
    ],
    order: [["createdAt", "DESC"]],
  }).catch(() => [] as TacticalKpi[]);

  const matchesAnalyzed = kpis.length;

  // Build KPI snapshot (averages)
  const kpiSnapshot: Record<string, number> = {};
  if (matchesAnalyzed > 0) {
    const fields: (keyof TacticalKpi)[] = [
      "pressIntensity",
      "defensiveContributionPct",
      "progressivePassRate",
      "chancesCreatedPer90",
      "xgContribution",
      "territorialControl",
      "counterPressSuccess",
      "buildUpInvolvement",
      "overallTacticalScore",
    ];
    for (const field of fields) {
      const vals = kpis
        .map((k) => k[field])
        .filter((v): v is number => typeof v === "number");
      if (vals.length > 0) {
        kpiSnapshot[field as string] = parseFloat(
          (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
        );
      }
    }
  }

  // Derive strengths / weaknesses from averages
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (kpiSnapshot.overallTacticalScore >= 70)
    strengths.push("Strong overall tactical score");
  else if (kpiSnapshot.overallTacticalScore < 50)
    weaknesses.push("Overall tactical score needs improvement");

  if (kpiSnapshot.progressivePassRate >= 75)
    strengths.push("Excellent progressive passing");
  else if (kpiSnapshot.progressivePassRate < 55)
    weaknesses.push("Progressive pass completion rate below average");

  if (kpiSnapshot.pressIntensity >= 8)
    strengths.push("High pressing intensity");
  else if (kpiSnapshot.pressIntensity < 4)
    weaknesses.push("Low pressing contribution");

  if (kpiSnapshot.chancesCreatedPer90 >= 2)
    strengths.push("Good chance creation per 90");
  if (kpiSnapshot.defensiveContributionPct >= 65)
    strengths.push("Strong defensive involvement");

  const monthName = new Date(year, month - 1).toLocaleString("en", {
    month: "long",
  });

  const player = await Player.findByPk(playerId, {
    attributes: ["firstName", "lastName", "firstNameAr", "lastNameAr"],
  });
  const playerName = player
    ? `${player.firstName} ${player.lastName}`
    : "Player";

  const record = await TacticalReport.create({
    playerId,
    analystId,
    month,
    year,
    title: `Tactical Report — ${playerName} — ${monthName} ${year}`,
    titleAr: `تقرير تكتيكي — ${player?.firstNameAr ?? player?.firstName} ${player?.lastNameAr ?? player?.lastName} — ${monthName} ${year}`,
    summary:
      matchesAnalyzed > 0
        ? `Auto-generated tactical analysis covering ${matchesAnalyzed} match(es) in ${monthName} ${year}.`
        : `No match data found for ${monthName} ${year}. Manual entry required.`,
    kpiSnapshot,
    matchesAnalyzed,
    tacticalStrengths: strengths,
    tacticalWeaknesses: weaknesses,
    recommendations:
      strengths.length === 0 && weaknesses.length > 0
        ? ["Review training focus areas with coaching staff"]
        : [],
    status: "draft",
  });

  return getTacticalReportById(record.id);
}
