import { Op } from "sequelize";
import { Injury, InjuryUpdate } from "@modules/injuries/injury.model";
import { generateDisplayId } from "@shared/utils/displayId";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";
import { AppError } from "@middleware/errorHandler";
import { transaction } from "@config/database";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { notifyByRole } from "@modules/notifications/notification.service";
import { logger } from "@config/logger";
import {
  findOrThrow,
  destroyById,
  buildDateRange,
} from "@shared/utils/serviceHelpers";
import type {
  CreateInjuryInput,
  UpdateInjuryInput,
  AddInjuryUpdateInput,
} from "@modules/injuries/injury.validation";
import { generateCriticalInjuryTask } from "@modules/injuries/injuryAutoTasks";
import { generateAutoReferralForInjury } from "@modules/injuries/injuryAutoReferral";
import { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";
import { Referral } from "@modules/referrals/referral.model";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "position",
  "photoUrl",
] as const;

// ── List ──

export async function listInjuries(queryParams: any, user?: AuthUser) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "injuryDate",
  );
  const where: any = {};

  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.severity) where.severity = queryParams.severity;

  const dateRange = buildDateRange(queryParams.from, queryParams.to);
  if (dateRange) where.injuryDate = dateRange;

  if (search) {
    where[Op.or] = [
      { injuryType: { [Op.iLike]: `%${search}%` } },
      { bodyPart: { [Op.iLike]: `%${search}%` } },
      { diagnosis: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Row-level scoping
  const scope = await buildRowScope("injuries", user);
  if (scope) mergeScope(where, scope);

  const { count, rows } = await Injury.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [{ model: Player, as: "player", attributes: [...PLAYER_ATTRS] }],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getInjuryById(id: string, user?: AuthUser) {
  const injury = await Injury.findByPk(id, {
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      {
        model: Match,
        as: "match",
        attributes: ["id", "competition", "matchDate", "status"],
        required: false,
      },
      {
        model: InjuryUpdate,
        as: "updates",
        separate: true,
        order: [["updateDate", "DESC"]],
      },
    ],
  });
  if (!injury) throw new AppError("Injury not found", 404);

  // Row-level access check
  const hasAccess = await checkRowAccess("injuries", injury, user);
  if (!hasAccess) throw new AppError("Injury not found", 404);

  return injury;
}

// ── Get by Player ──

export async function getPlayerInjuries(playerId: string) {
  return Injury.findAll({
    where: { playerId },
    order: [["injuryDate", "DESC"]],
    include: [
      {
        model: InjuryUpdate,
        as: "updates",
        separate: true,
        order: [["updateDate", "DESC"]],
        limit: 3,
      },
    ],
  });
}

// ── Create ──

export async function createInjury(
  input: CreateInjuryInput,
  createdBy: string,
) {
  const player = await findOrThrow(Player, input.playerId, "Player");

  if (input.matchId) {
    await findOrThrow(Match, input.matchId, "Match");
  }

  const displayId = await generateDisplayId("injuries");

  const injury = await transaction(async (t) => {
    const inj = await Injury.create({ ...input, displayId, createdBy } as any, {
      transaction: t,
    });

    // Update player status to injured (atomic with injury creation)
    await player.update({ status: "injured" }, { transaction: t });

    return inj;
  });

  // ── Push notification (non-blocking — won't crash the endpoint) ──
  const playerName =
    [player.firstName, player.lastName].filter(Boolean).join(" ") || "Unknown";
  const playerNameAr = player.firstNameAr
    ? [player.firstNameAr, player.lastNameAr].filter(Boolean).join(" ")
    : playerName;

  notifyByRole(["Admin", "Manager"], {
    type: "injury",
    title: `New injury logged: ${playerName} — ${input.injuryType}`,
    titleAr: `إصابة جديدة: ${playerNameAr} — ${input.injuryTypeAr || input.injuryType}`,
    body: `${input.severity || "Moderate"} injury on ${input.injuryDate}. ${input.diagnosis || ""}`.trim(),
    bodyAr: `إصابة ${input.severity || "Moderate"} بتاريخ ${input.injuryDate}`,
    link: "/dashboard/injuries",
    sourceType: "injury",
    sourceId: injury.id,
    priority:
      input.severity === "Critical" || input.severity === "Severe"
        ? "critical"
        : "normal",
  }).catch((err) => logger.error("Failed to send injury notification", err));

  // Fire-and-forget: auto-create task for critical/severe injuries
  generateCriticalInjuryTask(injury.id, createdBy).catch((err) =>
    logger.warn("Injury auto-task generation failed", {
      injuryId: injury.id,
      error: (err as Error).message,
    }),
  );

  // Fire-and-forget: auto-create Medical case for every injury
  generateAutoReferralForInjury(injury.id, input.playerId, createdBy).catch(
    (err) =>
      logger.warn("Injury auto-case generation failed", {
        injuryId: injury.id,
        error: (err as Error).message,
      }),
  );

  return getInjuryById(injury.id);
}

// ── Sync linked case status when injury status changes ──

const INJURY_TO_CASE_STATUS: Record<string, string> = {
  Recovered: "Closed",
  Relapsed: "Open",
  Chronic: "InProgress",
  UnderTreatment: "InProgress",
};

async function syncCaseFromInjury(
  injuryId: string,
  injuryStatus: string,
  t?: any,
) {
  const linkedCase = await Referral.findOne({
    where: { injuryId } as any,
    ...(t ? { transaction: t } : {}),
  });
  if (!linkedCase) return;

  const newCaseStatus = INJURY_TO_CASE_STATUS[injuryStatus];
  if (!newCaseStatus || linkedCase.status === newCaseStatus) return;

  const updateData: Record<string, unknown> = { status: newCaseStatus };
  if (newCaseStatus === "Closed") updateData.closedAt = new Date();
  if (newCaseStatus === "Open" && linkedCase.closedAt)
    updateData.closedAt = null;

  await linkedCase.update(updateData, t ? { transaction: t } : undefined);
}

// ── Update ──

export async function updateInjury(id: string, input: UpdateInjuryInput) {
  const injury = await findOrThrow(Injury, id, "Injury");

  const updated = await injury.update(input as any);

  // Sync linked case status
  if (input.status) {
    syncCaseFromInjury(id, input.status).catch((err) =>
      logger.warn("Case sync from injury failed", {
        injuryId: id,
        error: (err as Error).message,
      }),
    );
  }

  // If recovered, update player status back to active
  if (input.status === "Recovered" && input.actualReturnDate) {
    const activeInjuries = await Injury.count({
      where: {
        playerId: injury.playerId,
        status: { [Op.in]: ["UnderTreatment", "Relapsed"] },
        id: { [Op.ne]: id },
      },
    });
    if (activeInjuries === 0) {
      await Player.update(
        { status: "active" },
        { where: { id: injury.playerId } },
      );
    }
  }

  return getInjuryById(updated.id);
}

// ── Add Progress Update ──

export async function addInjuryUpdate(
  injuryId: string,
  input: AddInjuryUpdateInput,
  userId: string,
) {
  const injury = await findOrThrow(Injury, injuryId, "Injury");

  return transaction(async (t) => {
    const update = await InjuryUpdate.create(
      {
        injuryId,
        updateDate: new Date().toISOString().split("T")[0],
        status: input.status || null,
        notes: input.notes,
        notesAr: input.notesAr || null,
        updatedBy: userId,
      } as any,
      { transaction: t },
    );

    if (input.status && input.status !== injury.status) {
      const statusUpdate: Record<string, unknown> = { status: input.status };
      if (input.status === "Recovered") {
        statusUpdate.actualReturnDate = new Date().toISOString().split("T")[0];
      }
      await injury.update(statusUpdate, { transaction: t });

      // Sync linked case status within the same transaction
      await syncCaseFromInjury(injuryId, input.status, t);

      if (input.status === "Recovered") {
        const activeCount = await Injury.count({
          where: {
            playerId: injury.playerId,
            status: { [Op.in]: ["UnderTreatment", "Relapsed"] },
            id: { [Op.ne]: injuryId },
          },
          transaction: t,
        });
        if (activeCount === 0) {
          await Player.update(
            { status: "active" },
            { where: { id: injury.playerId }, transaction: t },
          );
        }
      }
    }

    return update;
  });
}

// ── Delete ──

export async function deleteInjury(id: string) {
  return destroyById(Injury, id, "Injury");
}

// ── Stats ──

export async function getInjuryStats() {
  const [total, active, recovered] = await Promise.all([
    Injury.count(),
    Injury.count({
      where: { status: { [Op.in]: ["UnderTreatment", "Relapsed"] } },
    }),
    Injury.count({ where: { status: "Recovered" } }),
  ]);
  return { total, active, recovered, chronic: total - active - recovered };
}
