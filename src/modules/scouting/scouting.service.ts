import { Op } from "sequelize";
import { sequelize } from "@config/database";
import {
  Watchlist,
  ScreeningCase,
  SelectionDecision,
  type WatchlistAttributes,
  type ScreeningCaseAttributes,
} from "@modules/scouting/scouting.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { notifyByRole } from "@modules/notifications/notification.service";
import { logger } from "@config/logger";
import { AuthUser } from "@shared/types";
import {
  buildRowScope,
  mergeScope,
  checkRowAccess,
} from "@shared/utils/rowScope";

const USER_ATTRS = ["id", "fullName", "fullNameAr"] as const;

// ══════════════════════════════════════════
// WATCHLIST
// ══════════════════════════════════════════

export async function listWatchlist(queryParams: any, user?: AuthUser) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );
  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.priority) where.priority = queryParams.priority;
  if (queryParams.position)
    where.position = { [Op.iLike]: `%${queryParams.position}%` };
  if (queryParams.nationality)
    where.nationality = { [Op.iLike]: `%${queryParams.nationality}%` };

  if (search) {
    where[Op.or] = [
      { prospectName: { [Op.iLike]: `%${search}%` } },
      { prospectNameAr: { [Op.iLike]: `%${search}%` } },
      { currentClub: { [Op.iLike]: `%${search}%` } },
      { nationality: { [Op.iLike]: `%${search}%` } },
      { position: { [Op.iLike]: `%${search}%` } },
      { source: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Row-level scoping
  const scope = await buildRowScope("scouting", user);
  if (scope) mergeScope(where, scope);

  const { count, rows } = await Watchlist.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      { model: User, as: "scout", attributes: [...USER_ATTRS] },
      {
        model: ScreeningCase,
        as: "screeningCases",
        attributes: ["id", "status", "caseNumber"],
        required: false,
      },
    ],
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getWatchlistById(id: string, user?: AuthUser) {
  const item = await Watchlist.findByPk(id, {
    include: [
      { model: User, as: "scout", attributes: [...USER_ATTRS] },
      {
        model: ScreeningCase,
        as: "screeningCases",
        include: [{ model: SelectionDecision, as: "decisions" }],
      },
    ],
  });
  if (!item) throw new AppError("Watchlist entry not found", 404);

  // Row-level access check
  const hasAccess = await checkRowAccess("scouting", item, user);
  if (!hasAccess) throw new AppError("Watchlist entry not found", 404);

  return item;
}

export async function createWatchlist(input: any, userId: string) {
  return await Watchlist.create({ ...input, scoutedBy: userId });
}

export async function updateWatchlist(id: string, input: any) {
  const item = await findOrThrow(Watchlist, id, "Watchlist entry");
  return await item.update(input);
}

export async function updateWatchlistStatus(id: string, status: string) {
  const item = await findOrThrow(Watchlist, id, "Watchlist entry");
  return await item.update({ status: status as WatchlistAttributes["status"] });
}

export async function deleteWatchlist(id: string) {
  const item = await findOrThrow(Watchlist, id, "Watchlist entry");
  // Can't delete if has screening cases
  const cases = await ScreeningCase.count({ where: { watchlistId: id } });
  if (cases > 0)
    throw new AppError(
      "Cannot delete: screening case(s) exist for this prospect",
      400,
    );
  await item.destroy();
  return { id };
}

export async function checkDuplicate(
  name: string,
  dob?: string,
  club?: string,
) {
  const nameCondition = {
    [Op.or]: [
      { prospectName: { [Op.iLike]: `%${name}%` } },
      { prospectNameAr: { [Op.iLike]: `%${name}%` } },
    ],
  };

  const where: any = { ...nameCondition };
  if (dob) where.dateOfBirth = dob;
  if (club) where.currentClub = { [Op.iLike]: `%${club}%` };

  return Watchlist.findAll({
    where,
    limit: 5,
    attributes: [
      "id",
      "prospectName",
      "prospectNameAr",
      "dateOfBirth",
      "currentClub",
      "status",
      "priority",
    ],
    order: [["createdAt", "DESC"]],
  });
}

// ══════════════════════════════════════════
// SCREENING CASES
// ══════════════════════════════════════════

export async function createScreeningCase(input: any, userId: string) {
  const wl = await findOrThrow(Watchlist, input.watchlistId, "Watchlist entry");
  if (wl.status === "Rejected")
    throw new AppError("Cannot screen a rejected prospect", 400);

  // Check for existing open case
  const existing = await ScreeningCase.findOne({
    where: { watchlistId: input.watchlistId, status: { [Op.ne]: "Closed" } },
  });
  if (existing)
    throw new AppError(
      "An open screening case already exists for this prospect",
      409,
    );

  // Auto-generate case number
  const count = await ScreeningCase.count();
  const caseNumber = `SC-${String(count + 1).padStart(5, "0")}`;

  // Move watchlist to Shortlisted
  if (wl.status === "Active")
    await wl.update({ status: "Shortlisted" as WatchlistAttributes["status"] });

  const sc = await ScreeningCase.create({
    ...input,
    caseNumber,
    createdBy: userId,
  });

  // Notify Admin/Manager about new screening
  notifyByRole(["Admin", "Manager"], {
    type: "system",
    title: `Screening started: ${wl.prospectName}`,
    titleAr: `بدأ الفحص: ${wl.prospectNameAr || wl.prospectName}`,
    body: `Case ${caseNumber} opened`,
    bodyAr: `تم فتح الحالة ${caseNumber}`,
    link: `/dashboard/scouting/${wl.id}`,
    sourceType: "screening",
    sourceId: sc.id,
    priority: "normal",
  }).catch((err) =>
    logger.warn("Scouting notification failed", {
      error: (err as Error).message,
    }),
  );

  return sc;
}

export async function getScreeningCase(id: string) {
  const sc = await ScreeningCase.findByPk(id, {
    include: [
      { model: Watchlist, as: "watchlist" },
      { model: SelectionDecision, as: "decisions" },
      { model: User, as: "preparer", attributes: [...USER_ATTRS] },
      { model: User, as: "creator", attributes: [...USER_ATTRS] },
    ],
  });
  if (!sc) throw new AppError("Screening case not found", 404);
  return sc;
}

export async function updateScreeningCase(id: string, input: any) {
  const sc = await findOrThrow(ScreeningCase, id, "Screening case");
  if (sc.status === "Closed")
    throw new AppError("Cannot modify a closed screening case", 400);
  return await sc.update(input);
}

export async function markPackReady(id: string, userId: string) {
  const sc = await findOrThrow(ScreeningCase, id, "Screening case");
  if (sc.status === "Closed") throw new AppError("Case is closed", 400);

  // Verify prerequisites
  if (sc.identityCheck !== "Verified")
    throw new AppError("Identity check must be verified first", 400);
  if (!sc.medicalClearance)
    throw new AppError("Medical clearance is required", 400);

  await sc.update({
    isPackReady: true,
    packPreparedAt: new Date(),
    packPreparedBy: userId,
    status: "PackReady" as ScreeningCaseAttributes["status"],
  });

  // Notify Admin/Manager about pack ready
  const wl = await Watchlist.findByPk(sc.watchlistId);
  const name = wl?.prospectName || sc.caseNumber;
  const nameAr = wl?.prospectNameAr || name;
  notifyByRole(["Admin", "Manager"], {
    type: "system",
    title: `Scouting pack ready: ${name}`,
    titleAr: `ملف الاستكشاف جاهز: ${nameAr}`,
    body: `Case ${sc.caseNumber} is ready for review`,
    bodyAr: `الحالة ${sc.caseNumber} جاهزة للمراجعة`,
    link: `/dashboard/scouting/${sc.watchlistId}`,
    sourceType: "screening",
    sourceId: sc.id,
    priority: "high",
  }).catch((err) =>
    logger.warn("Scouting notification failed", {
      error: (err as Error).message,
    }),
  );

  return sc;
}

// ══════════════════════════════════════════
// SELECTION DECISIONS (Immutable)
// ══════════════════════════════════════════

export async function createDecision(input: any, userId: string) {
  const sc = await ScreeningCase.findByPk(input.screeningCaseId, {
    include: [{ model: Watchlist, as: "watchlist" }],
  });
  if (!sc) throw new AppError("Screening case not found", 404);
  if (!sc.isPackReady)
    throw new AppError("Pack must be ready before a decision can be made", 400);

  const decision = await SelectionDecision.create({
    ...input,
    recordedBy: userId,
  });

  // If Approved, close case; if Rejected, reject the watchlist entry
  if (input.decision === "Approved") {
    await sc.update({ status: "Closed" as ScreeningCaseAttributes["status"] });
  } else if (input.decision === "Rejected") {
    await sc.update({ status: "Closed" as ScreeningCaseAttributes["status"] });
    const wl = (sc as any).watchlist;
    if (wl)
      await wl.update({ status: "Rejected" as WatchlistAttributes["status"] });
  }

  // Notify Admin/Manager/Scout about decision
  const prospectName = (sc as any).watchlist?.prospectName || sc.caseNumber;
  const prospectNameAr = (sc as any).watchlist?.prospectNameAr || prospectName;
  notifyByRole(["Admin", "Manager", "Scout"], {
    type: "system",
    title: `Decision: ${input.decision} — ${prospectName}`,
    titleAr: `القرار: ${input.decision === "Approved" ? "مقبول" : input.decision === "Rejected" ? "مرفوض" : "مؤجل"} — ${prospectNameAr}`,
    body: `Committee: ${input.committeeName}`,
    bodyAr: `اللجنة: ${input.committeeName}`,
    link: `/dashboard/scouting/${(sc as any).watchlist?.id || ""}`,
    sourceType: "decision",
    sourceId: decision.id,
    priority: "high",
  }).catch((err) =>
    logger.warn("Scouting notification failed", {
      error: (err as Error).message,
    }),
  );

  return decision;
}

export async function getDecision(id: string) {
  const d = await SelectionDecision.findByPk(id, {
    include: [
      {
        model: ScreeningCase,
        as: "screeningCase",
        include: [{ model: Watchlist, as: "watchlist" }],
      },
    ],
  });
  if (!d) throw new AppError("Decision not found", 404);
  return d;
}

// ── Pipeline Summary (for KPIs) ──

export async function getPipelineSummary() {
  const [watchlist, screening, packReady, decisions] = await Promise.all([
    Watchlist.count({ where: { status: "Active" } }),
    ScreeningCase.count({ where: { status: "InProgress" } }),
    ScreeningCase.count({ where: { status: "PackReady" } }),
    SelectionDecision.count(),
  ]);
  const shortlisted = await Watchlist.count({
    where: { status: "Shortlisted" },
  });
  const rejected = await Watchlist.count({ where: { status: "Rejected" } });
  const total = await Watchlist.count();

  return {
    total,
    watchlist,
    shortlisted,
    screening,
    packReady,
    decisions,
    rejected,
  };
}

// ══════════════════════════════════════════
// PROSPECT TIMELINE (audit-based)
// ══════════════════════════════════════════

export async function getProspectTimeline(watchlistId: string) {
  // Verify prospect exists
  await findOrThrow(Watchlist, watchlistId, "Watchlist entry");

  // Gather related entity IDs
  const screeningCases = await ScreeningCase.findAll({
    where: { watchlistId },
    attributes: ["id"],
  });
  const scIds = screeningCases.map((sc) => sc.id);

  let decisionIds: string[] = [];
  if (scIds.length > 0) {
    const decisions = await SelectionDecision.findAll({
      where: { screeningCaseId: { [Op.in]: scIds } },
      attributes: ["id"],
    });
    decisionIds = decisions.map((d) => d.id);
  }

  // Build OR condition for audit logs
  const { AuditLog } = await import("@modules/audit/AuditLog.model");
  const orConditions: any[] = [{ entity: "watchlists", entityId: watchlistId }];
  if (scIds.length > 0) {
    orConditions.push({
      entity: "screening_cases",
      entityId: { [Op.in]: scIds },
    });
  }
  if (decisionIds.length > 0) {
    orConditions.push({
      entity: "selection_decisions",
      entityId: { [Op.in]: decisionIds },
    });
  }

  const logs = await AuditLog.findAll({
    where: { [Op.or]: orConditions },
    order: [["loggedAt", "DESC"]],
    limit: 100,
    attributes: [
      "id",
      "action",
      "entity",
      "entityId",
      "detail",
      "userName",
      "changes",
      "loggedAt",
    ],
  });

  return logs.map((log) => ({
    id: log.id,
    date: log.loggedAt?.toISOString() ?? "",
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    detail: log.detail,
    userName: log.userName,
    changes: log.changes,
  }));
}
