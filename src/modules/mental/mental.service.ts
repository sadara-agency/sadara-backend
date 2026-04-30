import { Op, WhereOptions } from "sequelize";
import {
  MentalAssessment,
  MentalAssessmentTemplate,
  ResponseEntry,
  ScoringRange,
  SeverityLevel,
} from "./mental.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { notifyByRole } from "@modules/notifications/notification.service";
import { logger } from "@config/logger";
import type { AuthUser } from "@shared/types";
import type {
  CreateTemplateDTO,
  UpdateTemplateDTO,
  CreateAssessmentDTO,
  UpdateAssessmentDTO,
  ListAssessmentsQuery,
} from "./mental.validation";

// ── Helpers ──

function canViewConfidential(user: AuthUser): boolean {
  return ["Admin", "MentalCoach"].includes(user.role);
}

function canViewOwn(user: AuthUser, playerId: string): boolean {
  return user.playerId === playerId;
}

/** Derive severity from scoring ranges. Falls back to null if no match. */
function scoreSeverity(
  score: number,
  ranges: ScoringRange[],
): SeverityLevel | null {
  const match = ranges.find((r) => score >= r.minScore && score <= r.maxScore);
  return match?.severity ?? null;
}

/** Compute total score from scale/boolean responses using question weights. */
function computeScore(
  responses: ResponseEntry[],
  questions: MentalAssessmentTemplate["questions"],
): number {
  let total = 0;
  for (const resp of responses) {
    const q = questions[resp.questionIndex];
    if (!q) continue;
    const weight = q.weight ?? 1;
    if (q.type === "scale" && typeof resp.value === "number") {
      total += resp.value * weight;
    } else if (q.type === "boolean") {
      total += (resp.value ? 1 : 0) * weight;
    }
    // text responses don't contribute to numeric score
  }
  return Math.round(total * 100) / 100;
}

// ── Template CRUD ──

export async function listTemplates(active?: boolean) {
  const where: WhereOptions = {};
  if (active !== undefined) where.isActive = active;
  return MentalAssessmentTemplate.findAll({ where, order: [["name", "ASC"]] });
}

export async function getTemplateById(id: string) {
  const tpl = await MentalAssessmentTemplate.findByPk(id);
  if (!tpl) throw new AppError("Template not found", 404);
  return tpl;
}

export async function createTemplate(
  data: CreateTemplateDTO,
  createdBy: string,
) {
  return MentalAssessmentTemplate.create({ ...data, createdBy });
}

export async function updateTemplate(id: string, data: UpdateTemplateDTO) {
  const tpl = await getTemplateById(id);
  return tpl.update(data);
}

export async function deleteTemplate(id: string) {
  const tpl = await getTemplateById(id);
  await tpl.destroy();
  return { id };
}

// ── Assessment CRUD ──

export async function listAssessments(
  query: ListAssessmentsQuery,
  user: AuthUser,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const where: WhereOptions = {};

  if (query.playerId) where.playerId = query.playerId;
  if (query.templateId) where.templateId = query.templateId;
  if (query.status) where.status = query.status;
  if (query.severityLevel) where.severityLevel = query.severityLevel;
  if (query.from || query.to) {
    const dateRange: Record<string, string> = {};
    if (query.from) dateRange[Op.gte as unknown as string] = query.from;
    if (query.to) dateRange[Op.lte as unknown as string] = query.to;
    where.assessmentDate = dateRange;
  }

  // Privacy gate: non-MentalCoach/Admin can only see non-confidential records
  // unless they are the player themselves
  if (!canViewConfidential(user)) {
    if (user.role === "Player" && user.playerId) {
      // Players can only see their own
      where.playerId = user.playerId;
    } else {
      // Manager and others: only non-confidential
      where.isConfidential = false;
    }
  }

  const { rows, count } = await MentalAssessment.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["assessmentDate", "DESC"]],
    include: [
      {
        model: MentalAssessmentTemplate,
        as: "template",
        attributes: ["id", "name", "nameAr", "category"],
      },
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
  });

  return {
    data: rows,
    meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

export async function getAssessmentById(id: string, user: AuthUser) {
  const assessment = await MentalAssessment.findByPk(id, {
    include: [
      { model: MentalAssessmentTemplate, as: "template" },
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
      {
        model: User,
        as: "administrator",
        attributes: ["id", "firstName", "lastName"],
      },
    ],
  });
  if (!assessment) throw new AppError("Assessment not found", 404);

  // Privacy: confidential records only for MentalCoach, Admin, or own player
  if (
    assessment.isConfidential &&
    !canViewConfidential(user) &&
    !canViewOwn(user, assessment.playerId)
  ) {
    throw new AppError("Access denied to confidential assessment", 403);
  }

  return assessment;
}

export async function createAssessment(
  data: CreateAssessmentDTO,
  userId: string,
) {
  const template = await getTemplateById(data.templateId);

  // Auto-score from responses
  const totalScore = computeScore(data.responses, template.questions);
  const severityLevel = template.scoringRanges?.length
    ? scoreSeverity(totalScore, template.scoringRanges)
    : null;

  const assessment = await MentalAssessment.create({
    ...data,
    totalScore,
    severityLevel,
    administeredBy: data.administeredBy ?? userId,
    status: data.status ?? "completed",
    isConfidential: data.isConfidential ?? true,
    recommendedActions: data.recommendedActions ?? [],
  });

  // Crisis notification: alert Admin + Manager when severity is severe or critical
  if (severityLevel && ["severe", "critical"].includes(severityLevel)) {
    notifyByRole(["Admin", "Manager"], {
      type: "mental_alert",
      title: "Mental Health Alert",
      titleAr: "تنبيه الصحة النفسية",
      body: `A ${severityLevel} assessment has been recorded for a player.`,
      bodyAr: `تم تسجيل تقييم ${severityLevel === "severe" ? "حاد" : "بالغ الحدة"} للاعب.`,
      priority: "high",
      sourceType: "mental",
      sourceId: assessment.id,
      link: `/dashboard/mental`,
    }).catch((err: Error) =>
      logger.warn("mental_alert notification failed", { error: err.message }),
    );
  }

  return assessment;
}

export async function updateAssessment(
  id: string,
  data: UpdateAssessmentDTO,
  user: AuthUser,
) {
  const assessment = await getAssessmentById(id, user);
  return assessment.update(data);
}

export async function deleteAssessment(id: string, user: AuthUser) {
  const assessment = await getAssessmentById(id, user);
  await assessment.destroy();
  return { id };
}

// ── Analytics ──

/** Returns the last N assessments for a player per template category. */
export async function getTrendForPlayer(
  playerId: string,
  user: AuthUser,
  limit = 10,
) {
  if (!canViewConfidential(user) && !canViewOwn(user, playerId)) {
    throw new AppError("Access denied", 403);
  }

  const rows = await MentalAssessment.findAll({
    where: { playerId },
    order: [["assessmentDate", "DESC"]],
    limit,
    include: [
      {
        model: MentalAssessmentTemplate,
        as: "template",
        attributes: ["id", "name", "nameAr", "category"],
      },
    ],
  });

  return rows;
}

/** Returns players with recent worsening severity scores (for MentalCoach dashboard). */
export async function getAlerts(user: AuthUser) {
  if (!canViewConfidential(user)) {
    throw new AppError("Access denied", 403);
  }

  // Find players whose most recent severity is moderate or severe
  const recent = await MentalAssessment.findAll({
    where: {
      severityLevel: { [Op.in]: ["moderate", "severe"] },
      assessmentDate: {
        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      },
    },
    order: [["assessmentDate", "DESC"]],
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
      {
        model: MentalAssessmentTemplate,
        as: "template",
        attributes: ["id", "name", "category"],
      },
    ],
  });

  return recent;
}
