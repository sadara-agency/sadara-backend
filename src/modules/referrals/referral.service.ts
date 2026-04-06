import { Op } from "sequelize";
import {
  Referral,
  type ReferralAttributes,
} from "@modules/referrals/referral.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { Injury } from "@modules/injuries/injury.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import {
  notifyByRole,
  notifyUser,
} from "@modules/notifications/notification.service";
import { logger } from "@config/logger";
import { generateCriticalReferralTask } from "@modules/referrals/referralAutoTasks";
import { generateDisplayId } from "@shared/utils/displayId";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
  "photoUrl",
  "position",
] as const;
const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

function referralIncludes() {
  return [
    { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
    { model: User, as: "assignee", attributes: [...USER_ATTRS] },
    { model: User, as: "creator", attributes: [...USER_ATTRS] },
  ];
}

async function refetchWithIncludes(id: string) {
  return Referral.findByPk(id, { include: referralIncludes() });
}

// ── Access Control ──

function applyAccessFilter(where: any, userId: string, userRole: string) {
  if (["Admin", "Manager", "Executive"].includes(userRole)) return;

  const accessConditions = [
    { isRestricted: false },
    { restrictedTo: { [Op.contains]: [userId] } },
    { assignedTo: userId },
    { createdBy: userId },
  ];

  if (where[Op.or]) {
    const searchConditions = where[Op.or];
    delete where[Op.or];
    where[Op.and] = [
      { [Op.or]: searchConditions },
      { [Op.or]: accessConditions },
    ];
  } else {
    where[Op.or] = accessConditions;
  }
}

// ── List ──

export async function listReferrals(
  queryParams: any,
  userId: string,
  userRole: string,
) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );
  const where: any = {};

  if (queryParams.status) {
    where.status = Array.isArray(queryParams.status)
      ? { [Op.in]: queryParams.status }
      : queryParams.status;
  }
  if (queryParams.referralType) where.referralType = queryParams.referralType;
  if (queryParams.referralTarget)
    where.referralTarget = queryParams.referralTarget;
  if (queryParams.priority) where.priority = queryParams.priority;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.assignedTo) where.assignedTo = queryParams.assignedTo;

  if (search) {
    where[Op.or] = [
      { triggerDesc: { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } },
      { outcome: { [Op.iLike]: `%${search}%` } },
      { "$player.first_name$": { [Op.iLike]: `%${search}%` } },
      { "$player.last_name$": { [Op.iLike]: `%${search}%` } },
    ];
  }

  applyAccessFilter(where, userId, userRole);

  const { count, rows } = await Referral.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: referralIncludes(),
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getReferralById(
  id: string,
  userId: string,
  userRole: string,
) {
  const referral = await Referral.findByPk(id, { include: referralIncludes() });
  if (!referral) throw new AppError("Referral not found", 404);

  if (
    referral.isRestricted &&
    !["Admin", "Manager", "Executive"].includes(userRole)
  ) {
    const allowed = referral.restrictedTo || [];
    if (
      !allowed.includes(userId) &&
      referral.assignedTo !== userId &&
      referral.createdBy !== userId
    ) {
      throw new AppError("Access denied: this referral is restricted", 403);
    }
  }

  return referral;
}

// ── Check Duplicate ──

export async function checkDuplicate(playerId: string, referralType: string) {
  const existing = await Referral.findAll({
    where: {
      playerId,
      referralType,
      status: { [Op.in]: ["Open", "InProgress", "Waiting"] },
    },
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      { model: User, as: "assignee", attributes: [...USER_ATTRS] },
    ],
    order: [["createdAt", "DESC"]],
  });

  return { duplicates: existing };
}

// ── Create ──

export async function createReferral(input: any, userId: string) {
  const player = await findOrThrow(Player, input.playerId, "Player");

  if (input.assignedTo) {
    await findOrThrow(User, input.assignedTo, "Assigned user");
  }

  // Auto-assignment: if referralTarget is provided but no assignedTo
  if (input.referralTarget && !input.assignedTo) {
    const targetUser = await User.findOne({
      where: { role: input.referralTarget, isActive: true } as any,
      attributes: ["id"],
    });
    if (targetUser) {
      input.assignedTo = targetUser.id;
    }
  }

  // Mental referrals are automatically restricted
  if (input.referralType === "Mental") {
    input.isRestricted = true;
  }

  const displayId = await generateDisplayId("referrals");

  const referral = await Referral.create({
    ...input,
    displayId,
    createdBy: userId,
    assignedAt: input.assignedTo ? new Date() : null,
  });

  // ── Push notification (non-blocking) ──
  const playerName = `${player.firstName} ${player.lastName}`.trim();
  const playerNameAr = (player as any).firstNameAr
    ? `${(player as any).firstNameAr} ${(player as any).lastNameAr || ""}`.trim()
    : playerName;

  const typeLabel = input.referralType || "General";

  // Notify managers
  notifyByRole(["Admin", "Manager"], {
    type: "referral",
    title: `New ${typeLabel} referral: ${playerName}`,
    titleAr: `إحالة ${typeLabel} جديدة: ${playerNameAr}`,
    body:
      input.triggerDesc || `${typeLabel} referral created for ${playerName}`,
    link: `/dashboard/referrals/${referral.id}`,
    sourceType: "referral",
    sourceId: referral.id,
    priority:
      input.priority === "Critical"
        ? "critical"
        : input.priority === "High"
          ? "high"
          : "normal",
  }).catch((err) => logger.error("Failed to send referral notification", err));

  // Notify assignee directly
  if (input.assignedTo) {
    notifyUser(input.assignedTo, {
      type: "referral",
      title: `Referral assigned to you: ${playerName}`,
      titleAr: `إحالة مسندة إليك: ${playerNameAr}`,
      body: input.triggerDesc || `${typeLabel} referral for ${playerName}`,
      link: `/dashboard/referrals/${referral.id}`,
      sourceType: "referral",
      sourceId: referral.id,
      priority: input.priority === "Critical" ? "critical" : "normal",
    }).catch((err) =>
      logger.error("Failed to send assignee notification", err),
    );
  }

  // Auto-task: critical referral → Manager (fire-and-forget)
  generateCriticalReferralTask(referral.id, userId).catch((err) =>
    logger.warn("Auto-task referral_critical_created failed", {
      error: (err as Error).message,
    }),
  );

  return refetchWithIncludes(referral.id);
}

// ── Update ──

export async function updateReferral(
  id: string,
  input: any,
  userId: string,
  userRole: string,
) {
  const referral = await getReferralById(id, userId, userRole);

  // Track assignment change
  if (input.assignedTo && input.assignedTo !== referral.assignedTo) {
    input.assignedAt = new Date();

    // Notify new assignee
    const player = referral.get("player") as any;
    const playerName = player
      ? `${player.firstName} ${player.lastName}`.trim()
      : "";

    notifyUser(input.assignedTo, {
      type: "referral",
      title: `Referral reassigned to you: ${playerName}`,
      titleAr: `إحالة أعيد إسنادها إليك: ${playerName}`,
      link: `/dashboard/referrals/${id}`,
      sourceType: "referral",
      sourceId: id,
      priority: "normal",
    }).catch((err) =>
      logger.error("Failed to send reassignment notification", err),
    );
  }

  await referral.update(input);
  return refetchWithIncludes(id);
}

// ── Update Status ──

export async function updateReferralStatus(
  id: string,
  input: any,
  userId: string,
  userRole: string,
) {
  const referral = await getReferralById(id, userId, userRole);

  const updateData: Partial<ReferralAttributes> = {
    status: input.status as ReferralAttributes["status"],
  };

  if (input.outcome) updateData.outcome = input.outcome;
  if (input.notes) updateData.notes = input.notes;

  if (input.status === "Closed") {
    updateData.closedAt = new Date();
    if (input.closureNotes) updateData.closureNotes = input.closureNotes;
  }

  // Handle re-opening: from Closed to another status
  if (referral.status === "Closed" && input.status !== "Closed") {
    updateData.closedAt = null;

    const player = referral.get("player") as any;
    const playerName = player
      ? `${player.firstName} ${player.lastName}`.trim()
      : "";

    notifyByRole(["Admin", "Manager"], {
      type: "referral",
      title: `Referral re-opened: ${playerName}`,
      titleAr: `إحالة أعيد فتحها: ${playerName}`,
      body: input.notes || `Referral ${id} re-opened`,
      link: `/dashboard/referrals/${id}`,
      sourceType: "referral",
      sourceId: id,
      priority: "high",
    }).catch((err) => logger.error("Failed to send re-open notification", err));
  }

  await referral.update(updateData);

  // Reverse sync: if case closed and has linked injury, recover the injury
  if (input.status === "Closed" && referral.injuryId) {
    syncInjuryFromCase(referral.injuryId, referral.playerId).catch((err) =>
      logger.warn("Injury sync from case failed", {
        referralId: id,
        error: (err as Error).message,
      }),
    );
  }

  return refetchWithIncludes(id);
}

/**
 * When a Medical case is closed, mark the linked injury as Recovered
 * and reset the player's status to active if no other active injuries remain.
 */
async function syncInjuryFromCase(
  injuryId: string,
  playerId: string,
): Promise<void> {
  const injury = await Injury.findByPk(injuryId);
  if (!injury || injury.status === "Recovered") return;

  await injury.update({
    status: "Recovered",
    actualReturnDate: new Date().toISOString().split("T")[0],
  } as any);

  // Check if player has other active injuries
  const activeCount = await Injury.count({
    where: {
      playerId,
      status: { [Op.in]: ["UnderTreatment", "Relapsed"] },
      id: { [Op.ne]: injuryId },
    },
  });
  if (activeCount === 0) {
    await Player.update({ status: "active" }, { where: { id: playerId } });
  }
}

// ── Delete ──

export async function deleteReferral(
  id: string,
  userId: string,
  userRole: string,
) {
  const referral = await getReferralById(id, userId, userRole);

  if (referral.status === "Closed") {
    throw new AppError("Cannot delete a closed referral", 400);
  }

  await referral.destroy();
  return { id };
}
