import { Op, QueryTypes } from "sequelize";
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
import { AuthUser, ROLES, UserRole } from "@shared/types";
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
        separate: true,
        order: [["createdAt", "DESC"]],
      },
    ],
    distinct: true,
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
// BULK OPERATIONS
// ══════════════════════════════════════════

export async function bulkUpdateStatus(ids: string[], status: string) {
  const [updated] = await Watchlist.update({ status } as any, {
    where: { id: { [Op.in]: ids } },
  });
  return { updated };
}

export async function bulkUpdatePriority(ids: string[], priority: string) {
  const [updated] = await Watchlist.update({ priority } as any, {
    where: { id: { [Op.in]: ids } },
  });
  return { updated };
}

export async function bulkDelete(ids: string[]) {
  // Check for prospects with screening cases
  const blocked = await ScreeningCase.findAll({
    where: { watchlistId: { [Op.in]: ids } },
    attributes: ["watchlistId"],
    group: ["watchlistId"],
  });
  const blockedIds = blocked.map((b) => (b as any).watchlistId as string);

  if (blockedIds.length > 0) {
    throw new AppError(
      `Cannot delete ${blockedIds.length} prospect(s) with screening cases. Remove screening cases first.`,
      400,
    );
  }

  const deleted = await Watchlist.destroy({
    where: { id: { [Op.in]: ids } },
  });
  return { deleted };
}

export async function exportWatchlistCsv(ids: string[]) {
  const items = await Watchlist.findAll({
    where: { id: { [Op.in]: ids } },
    include: [
      { model: User, as: "scout", attributes: ["fullName", "fullNameAr"] },
    ],
    order: [["createdAt", "DESC"]],
  });

  const headers = [
    "Name",
    "Name (Ar)",
    "DOB",
    "Nationality",
    "Position",
    "Club",
    "League",
    "Status",
    "Priority",
    "Technical",
    "Physical",
    "Mental",
    "Potential",
    "Source",
    "Scout",
    "Added",
  ];

  const rows = items.map((w) => {
    const scout = (w as any).scout;
    return [
      w.prospectName,
      w.prospectNameAr ?? "",
      w.dateOfBirth ?? "",
      w.nationality ?? "",
      w.position ?? "",
      w.currentClub ?? "",
      w.currentLeague ?? "",
      w.status,
      w.priority,
      w.technicalRating ?? "",
      w.physicalRating ?? "",
      w.mentalRating ?? "",
      w.potentialRating ?? "",
      w.source ?? "",
      scout?.fullName ?? "",
      w.createdAt ? new Date(w.createdAt).toISOString().split("T")[0] : "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
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
  notifyByRole([ROLES.ADMIN, ROLES.MANAGER], {
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
  notifyByRole([ROLES.ADMIN, ROLES.MANAGER], {
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
  notifyByRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.SCOUT], {
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
// Uses stage-based exclusive counts (mirrors deriveStage on the frontend)
// so that sum(watchlist + screening + packReady + decided + rejected) = total.
// Each Watchlist entry is counted in exactly one bucket.
export async function getPipelineSummary() {
  type SummaryRow = {
    watchlist: string;
    screening: string;
    pack_ready: string;
    decided: string;
    rejected: string;
  };
  const [row] = await sequelize.query<SummaryRow>(
    `WITH latest_sc AS (
       SELECT DISTINCT ON (watchlist_id) watchlist_id, status
       FROM screening_cases
       ORDER BY watchlist_id, created_at DESC
     )
     SELECT
       COUNT(*) FILTER (
         WHERE w.status NOT IN ('Rejected','Archived') AND ls.watchlist_id IS NULL
       )::int AS watchlist,
       COUNT(*) FILTER (WHERE ls.status = 'InProgress')::int  AS screening,
       COUNT(*) FILTER (WHERE ls.status = 'PackReady')::int   AS pack_ready,
       COUNT(*) FILTER (WHERE ls.status = 'Closed')::int      AS decided,
       COUNT(*) FILTER (WHERE w.status = 'Rejected')::int     AS rejected
     FROM watchlist w
     LEFT JOIN latest_sc ls ON ls.watchlist_id = w.id`,
    { type: QueryTypes.SELECT },
  );

  const watchlist = Number(row?.watchlist ?? 0);
  const screening = Number(row?.screening ?? 0);
  const packReady = Number(row?.pack_ready ?? 0);
  const decided = Number(row?.decided ?? 0);
  const rejected = Number(row?.rejected ?? 0);

  return {
    total: watchlist + screening + packReady + decided + rejected,
    watchlist,
    screening,
    packReady,
    decided,
    rejected,
  };
}

// ══════════════════════════════════════════
// SCOUT DASHBOARD
// ══════════════════════════════════════════

export async function getScoutDashboard(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    pipeline,
    recentActivity,
    expiringScreenings,
    priorityAlerts,
    addedThisMonth,
    pendingDecisions,
  ] = await Promise.all([
    // Pipeline counts
    Promise.all([
      Watchlist.count({ where: { status: "Active" } }),
      Watchlist.count({ where: { status: "Shortlisted" } }),
      ScreeningCase.count({ where: { status: "InProgress" } }),
      ScreeningCase.count({ where: { status: "PackReady" } }),
      SelectionDecision.count(),
      Watchlist.count({ where: { status: "Rejected" } }),
      Watchlist.count(),
    ]).then(
      ([
        active,
        shortlisted,
        screening,
        packReady,
        decided,
        rejected,
        total,
      ]) => ({
        total,
        active,
        shortlisted,
        screening,
        packReady,
        decided,
        rejected,
      }),
    ),

    // Recent activity (last 5 updated by this scout)
    Watchlist.findAll({
      where: { scoutedBy: userId },
      order: [["updatedAt", "DESC"]],
      limit: 5,
      attributes: [
        "id",
        "prospectName",
        "prospectNameAr",
        "status",
        "priority",
        "position",
        "currentClub",
        "updatedAt",
      ],
    }),

    // Expiring screenings (InProgress > 14 days)
    ScreeningCase.findAll({
      where: {
        status: "InProgress",
        createdAt: { [Op.lt]: fourteenDaysAgo },
      },
      include: [
        {
          model: Watchlist,
          as: "watchlist",
          attributes: ["id", "prospectName", "prospectNameAr", "priority"],
        },
      ],
      order: [["createdAt", "ASC"]],
      limit: 10,
      attributes: ["id", "caseNumber", "createdAt", "status"],
    }),

    // Priority alerts (High priority, Active/Shortlisted)
    Watchlist.findAll({
      where: {
        priority: "High",
        status: { [Op.in]: ["Active", "Shortlisted"] },
      },
      order: [["createdAt", "DESC"]],
      limit: 8,
      attributes: [
        "id",
        "prospectName",
        "prospectNameAr",
        "status",
        "position",
        "currentClub",
        "createdAt",
      ],
    }),

    // Added this month by this scout
    Watchlist.count({
      where: {
        scoutedBy: userId,
        createdAt: { [Op.gte]: startOfMonth },
      },
    }),

    // Pending decisions (PackReady cases)
    ScreeningCase.count({ where: { status: "PackReady" } }),
  ]);

  // Avg pipeline time (raw SQL for efficiency)
  let avgDays = 0;
  try {
    const [result] = await sequelize.query<{ avg_days: number }>(
      `SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (sd.created_at - w.created_at)) / 86400),
        0
      ) as avg_days
      FROM watchlists w
      JOIN screening_cases sc ON sc.watchlist_id = w.id
      JOIN selection_decisions sd ON sd.screening_case_id = sc.id`,
      { type: "SELECT" as any },
    );
    avgDays = Math.round((result as any)?.avg_days ?? 0);
  } catch {
    avgDays = 0;
  }

  // Conversion rates — query historical totals (how many EVER entered each stage)
  let conversionRates = {
    watchlistToScreening: 0,
    screeningToPackReady: 0,
    packReadyToDecided: 0,
  };
  try {
    const everScreened = await ScreeningCase.count(); // every prospect that ever got a screening
    const everPackReady = await ScreeningCase.count({
      where: { isPackReady: true },
    });
    const everDecided = await SelectionDecision.count();

    conversionRates = {
      watchlistToScreening:
        pipeline.total > 0
          ? Math.min(100, Math.round((everScreened / pipeline.total) * 100))
          : 0,
      screeningToPackReady:
        everScreened > 0
          ? Math.min(100, Math.round((everPackReady / everScreened) * 100))
          : 0,
      packReadyToDecided:
        everPackReady > 0
          ? Math.min(100, Math.round((everDecided / everPackReady) * 100))
          : 0,
    };
  } catch {
    // keep defaults
  }

  return {
    pipeline,
    conversionRates,
    recentActivity,
    expiringScreenings,
    priorityAlerts,
    kpis: {
      addedThisMonth,
      pendingDecisions,
      avgDays,
    },
  };
}

// ══════════════════════════════════════════
// SCOUT PERFORMANCE ANALYTICS
// ══════════════════════════════════════════

export async function getScoutAnalytics(
  filters?: { scoutId?: string; dateFrom?: string; dateTo?: string },
  user?: AuthUser,
) {
  const ANALYTICS_BYPASS: UserRole[] = [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.EXECUTIVE,
  ];

  // Scout role can only see their own analytics — force scoutId to their own id
  const resolvedScoutId =
    user && !ANALYTICS_BYPASS.includes(user.role) ? user.id : filters?.scoutId;

  // Build parameterized filter clauses — no string interpolation
  const replacements: Record<string, unknown> = {};
  let scoutFilter = "";
  let dateFilter = "";
  let dateToFilter = "";

  if (resolvedScoutId) {
    scoutFilter = "AND w.scouted_by = :scoutId";
    replacements.scoutId = resolvedScoutId;
  }
  if (filters?.dateFrom) {
    dateFilter = "AND w.created_at >= :dateFrom";
    replacements.dateFrom = filters.dateFrom;
  }
  if (filters?.dateTo) {
    dateToFilter = "AND w.created_at <= :dateTo";
    replacements.dateTo = filters.dateTo;
  }
  const allFilters = `${scoutFilter} ${dateFilter} ${dateToFilter}`;

  // 1. Prospects added per month per scout (last 12 months)
  const monthlyRaw = await sequelize.query<{
    month: string;
    scout_id: string;
    scout_name: string;
    count: string;
  }>(
    `SELECT
      TO_CHAR(DATE_TRUNC('month', w.created_at), 'YYYY-MM') as month,
      w.scouted_by as scout_id,
      COALESCE(u.full_name, 'Unknown') as scout_name,
      COUNT(*)::text as count
    FROM watchlists w
    LEFT JOIN users u ON u.id = w.scouted_by
    WHERE w.created_at >= NOW() - INTERVAL '12 months'
      ${allFilters}
    GROUP BY month, w.scouted_by, u.full_name
    ORDER BY month`,
    { type: "SELECT" as any, replacements },
  );

  // 2. Conversion rates per scout
  const conversionRaw = await sequelize.query<{
    scout_id: string;
    scout_name: string;
    total: string;
    screened: string;
    approved: string;
    rejected: string;
  }>(
    `SELECT
      w.scouted_by as scout_id,
      COALESCE(u.full_name, 'Unknown') as scout_name,
      COUNT(DISTINCT w.id)::text as total,
      COUNT(DISTINCT sc.id)::text as screened,
      COUNT(DISTINCT CASE WHEN sd.decision = 'Approved' THEN sd.id END)::text as approved,
      COUNT(DISTINCT CASE WHEN sd.decision = 'Rejected' THEN sd.id END)::text as rejected
    FROM watchlists w
    LEFT JOIN users u ON u.id = w.scouted_by
    LEFT JOIN screening_cases sc ON sc.watchlist_id = w.id
    LEFT JOIN selection_decisions sd ON sd.screening_case_id = sc.id
    WHERE 1=1 ${allFilters}
    GROUP BY w.scouted_by, u.full_name
    ORDER BY total DESC`,
    { type: "SELECT" as any, replacements },
  );

  // 3. Average time-to-decision per scout
  const avgTimeRaw = await sequelize.query<{
    scout_id: string;
    scout_name: string;
    avg_days: string;
  }>(
    `SELECT
      w.scouted_by as scout_id,
      COALESCE(u.full_name, 'Unknown') as scout_name,
      ROUND(AVG(EXTRACT(EPOCH FROM (sd.created_at - w.created_at)) / 86400))::text as avg_days
    FROM watchlists w
    JOIN screening_cases sc ON sc.watchlist_id = w.id
    JOIN selection_decisions sd ON sd.screening_case_id = sc.id
    LEFT JOIN users u ON u.id = w.scouted_by
    WHERE 1=1 ${allFilters}
    GROUP BY w.scouted_by, u.full_name
    ORDER BY avg_days`,
    { type: "SELECT" as any, replacements },
  );

  return {
    monthlyAdditions: (monthlyRaw as any[]).map((r) => ({
      month: r.month,
      scoutId: r.scout_id,
      scoutName: r.scout_name,
      count: parseInt(r.count, 10),
    })),
    conversionRates: (conversionRaw as any[]).map((r) => ({
      scoutId: r.scout_id,
      scoutName: r.scout_name,
      total: parseInt(r.total, 10),
      screened: parseInt(r.screened, 10),
      approved: parseInt(r.approved, 10),
      rejected: parseInt(r.rejected, 10),
    })),
    avgTimeToDecision: (avgTimeRaw as any[]).map((r) => ({
      scoutId: r.scout_id,
      scoutName: r.scout_name,
      avgDays: parseInt(r.avg_days, 10) || 0,
    })),
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
