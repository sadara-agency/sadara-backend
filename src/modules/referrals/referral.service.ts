import { Op } from "sequelize";
import {
  Referral,
  type ReferralAttributes,
} from "@modules/referrals/referral.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { Injury } from "@modules/injuries/injury.model";
import { Session } from "@modules/sessions/session.model";
import { Ticket } from "@modules/tickets/ticket.model";
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

// ════════════════════════════════════════════════════════════════════════════
// ── SPORTS MANAGER OVERSIGHT & MONITORING ──
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get manager dashboard overview:
 * - Count of referrals by status
 * - Critical/High priority referrals
 * - Overdue referrals
 * - Specialist performance summary
 */
export async function getManagerDashboard() {
  const today = new Date().toISOString().split("T")[0];

  // Aggregate by status
  const statusCounts = await Referral.findAll({
    attributes: [
      "status",
      [
        require("sequelize").fn("COUNT", require("sequelize").col("*")),
        "count",
      ],
    ],
    group: ["status"],
    raw: true,
  });

  // Critical/High priority open
  const criticalReferrals = await Referral.findAll({
    where: {
      status: { [Op.in]: ["Open", "InProgress", "Waiting"] },
      priority: { [Op.in]: ["Critical", "High"] },
    },
    include: referralIncludes(),
    limit: 10,
    order: [["createdAt", "DESC"]],
  });

  // Overdue (no session or no recent session past due date)
  const overdueReferrals = await Referral.findAll({
    where: {
      status: { [Op.in]: ["Open", "InProgress", "Waiting"] },
      dueDate: { [Op.lt]: today },
    },
    include: referralIncludes(),
    limit: 10,
    order: [["dueDate", "ASC"]],
  });

  // Specialist workload
  const specialistCounts = await Referral.findAll({
    where: { status: { [Op.in]: ["Open", "InProgress", "Waiting"] } },
    attributes: [
      "referralTarget",
      [
        require("sequelize").fn("COUNT", require("sequelize").col("*")),
        "count",
      ],
    ],
    group: ["referralTarget"],
    raw: true,
  });

  return {
    statusCounts: statusCounts.reduce((acc: any, row: any) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {}),
    criticalReferrals,
    overdueCount: overdueReferrals.length,
    overdue: overdueReferrals,
    specialistWorkload: specialistCounts.map((row: any) => ({
      specialist: row.referralTarget,
      activeCount: parseInt(row.count),
    })),
  };
}

/**
 * Get all open referrals grouped by specialist
 */
export async function getReferralsBySpecialist(query: any = {}) {
  const { limit = 100, offset = 0, specialist } = query;

  const where: any = { status: { [Op.in]: ["Open", "InProgress", "Waiting"] } };
  if (specialist) where.referralTarget = specialist;

  const { rows, count } = await Referral.findAndCountAll({
    where,
    include: referralIncludes(),
    order: [
      ["priority", "DESC"],
      ["createdAt", "DESC"],
    ],
    limit,
    offset,
  });

  // Group by specialist
  const grouped = rows.reduce(
    (acc: any, ref: any) => {
      const specialist = ref.referralTarget || "Unassigned";
      if (!acc[specialist]) acc[specialist] = [];
      acc[specialist].push(ref);
      return acc;
    },
    {} as Record<string, typeof rows>,
  );

  return { bySpecialist: grouped, total: count };
}

/**
 * Get overdue referrals and tickets
 */
export async function getOverdueReferrals(query: any = {}) {
  const { limit = 50, offset = 0, daysOverdue = 0 } = query;
  const today = new Date().toISOString().split("T")[0];
  const daysAgo = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const overdueReferrals = await Referral.findAll({
    where: {
      status: { [Op.in]: ["Open", "InProgress", "Waiting"] },
      dueDate: { [Op.between]: [daysAgo, today] },
    },
    include: referralIncludes(),
    order: [["dueDate", "ASC"]],
    limit,
    offset,
  });

  // Get overdue tickets (if Ticket model exists)
  let overdueTickets: any[] = [];
  try {
    overdueTickets = await Ticket.findAll({
      where: {
        status: { [Op.in]: ["Open", "InProgress"] },
        dueDate: { [Op.lt]: today },
      },
      limit,
      offset,
      order: [["dueDate", "ASC"]],
    });
  } catch {
    // Ticket model may not be available, continue without it
  }

  return {
    referrals: overdueReferrals,
    tickets: overdueTickets,
    totalOverdue: overdueReferrals.length + overdueTickets.length,
  };
}

/**
 * Get specialist performance through sessions
 * Shows: completed sessions, no-shows, cancellations
 */
export async function getSpecialistPerformance(query: any = {}) {
  const { specialist, limit = 10, offset = 0 } = query;
  const where: any = {};

  if (specialist) {
    where.programOwner = specialist;
  }

  // Get sessions grouped by specialist
  const sessions = await Session.findAll({
    where,
    include: [
      { model: Player, as: "player", attributes: [...PLAYER_ATTRS] },
      { model: User, as: "responsible", attributes: [...USER_ATTRS] },
      { model: Referral, as: "referral", attributes: ["id", "referralType"] },
    ],
    order: [["sessionDate", "DESC"]],
    limit: limit * 20, // Get more to analyze
  });

  // Aggregate performance metrics
  const performance = sessions.reduce(
    (acc: any, session: any) => {
      const specialist = session.programOwner;
      if (!acc[specialist]) {
        acc[specialist] = {
          specialist,
          total: 0,
          completed: 0,
          scheduled: 0,
          cancelled: 0,
          noShow: 0,
          completionRate: 0,
        };
      }

      acc[specialist].total++;
      acc[specialist][session.completionStatus.toLowerCase()]++;

      return acc;
    },
    {} as Record<
      string,
      {
        specialist: string;
        total: number;
        completed: number;
        scheduled: number;
        cancelled: number;
        noShow: number;
        completionRate: number;
      }
    >,
  );

  // Calculate completion rates
  Object.values(performance).forEach((metric: any) => {
    metric.completionRate =
      metric.total > 0
        ? Math.round((metric.completed / metric.total) * 100)
        : 0;
  });

  return {
    performance: Object.values(performance),
    recentSessions: sessions.slice(0, limit),
  };
}

/**
 * Escalate a referral (manager intervention)
 * Adds escalation note and optionally reassigns
 */
export async function escalateReferral(
  id: string,
  input: {
    escalationType:
      | "club_issue"
      | "external_coach"
      | "execution_delay"
      | "responsibility_conflict"
      | "redirection";
    escalationNote: string;
    reassignTo?: string | null;
  },
  userId: string,
) {
  const referral = await Referral.findByPk(id, { include: referralIncludes() });
  if (!referral) throw new AppError("Referral not found", 404);

  // Add escalation to notes
  const escalationPrefix = `[ESCALATION - ${input.escalationType.toUpperCase()}] ${new Date().toISOString().split("T")[0]}: `;
  const updatedNotes =
    (referral.notes || "") + "\n" + escalationPrefix + input.escalationNote;

  // Update referral
  if (input.reassignTo) {
    await findOrThrow(User, input.reassignTo, "Assigned user");
    await referral.update({
      assignedTo: input.reassignTo,
      assignedAt: new Date(),
      notes: updatedNotes,
      status: "InProgress", // Changed to InProgress on escalation
    });
  } else {
    await referral.update({
      notes: updatedNotes,
      status: "InProgress",
    });
  }

  // Notify assignee about escalation
  if (referral.assignedTo) {
    const escalationTitle =
      {
        club_issue: "⚠️ Club Issue - Manager Escalation",
        external_coach: "⚠️ External Coach Issue - Manager Escalation",
        execution_delay: "⚠️ Execution Delay - Manager Intervention",
        responsibility_conflict: "⚠️ Responsibility Conflict - Manager Review",
        redirection: "🔄 Referral Redirection - Manager Action",
      }[input.escalationType] || "Manager Escalation";

    notifyUser(referral.assignedTo, {
      type: "referral",
      title: escalationTitle,
      titleAr: escalationTitle, // TODO: Add Arabic versions
      body: input.escalationNote,
      link: `/dashboard/referrals/${referral.id}`,
      sourceType: "referral",
      sourceId: referral.id,
      priority: "high",
    }).catch((err) =>
      logger.error("Failed to notify on escalation", err as Error),
    );
  }

  // Log audit
  await logAudit(
    "ESCALATE",
    "referrals",
    referral.id,
    {
      userId,
      userRole: "Manager",
      userAgent: "sports-manager",
      ipAddress: "",
    },
    `Escalated referral: ${input.escalationType} - ${input.escalationNote}`,
  );

  return refetchWithIncludes(id);
}
