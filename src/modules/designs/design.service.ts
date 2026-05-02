import { Op } from "sequelize";
import Design from "./design.model";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  createNotification,
  notifyByRole,
} from "@modules/notifications/notification.service";
import type { AuthUser } from "@shared/types";
import type {
  CreateDesignInput,
  UpdateDesignInput,
  DesignQuery,
  QuickContentInput,
  ReviewNotesInput,
  MarkPublishedInput,
} from "./design.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
];
const MATCH_ATTRS = ["id", "homeTeamName", "awayTeamName", "matchDate"];
const CLUB_ATTRS = ["id", "name", "nameAr", "logoUrl"];
const USER_ATTRS = ["id", "fullName", "fullNameAr"];

const includeAll = [
  { model: Player, as: "player", attributes: PLAYER_ATTRS, required: false },
  { model: Match, as: "match", attributes: MATCH_ATTRS, required: false },
  { model: Club, as: "club", attributes: CLUB_ATTRS, required: false },
  { model: User, as: "creator", attributes: USER_ATTRS, required: false },
  { model: User, as: "owner", attributes: USER_ATTRS, required: false },
  { model: User, as: "approver", attributes: USER_ATTRS, required: false },
];

const ALLOWED_SORTS = [
  "created_at",
  "updated_at",
  "title",
  "status",
  "type",
  "scheduled_at",
];

export async function listDesigns(query: DesignQuery, _user?: AuthUser) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "created_at",
    ALLOWED_SORTS,
  );

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.playerId) where.playerId = query.playerId;
  if (query.matchId) where.matchId = query.matchId;
  if (query.clubId) where.clubId = query.clubId;
  if (query.createdBy) where.createdBy = query.createdBy;
  if (query.ownerId) where.ownerId = query.ownerId;
  if (query.approverId) where.approverId = query.approverId;
  if (query.contentPillar) where.contentPillar = query.contentPillar;

  // Today's Publishing: filter by date portion of scheduledAt
  if (query.scheduledDate) {
    const start = new Date(`${query.scheduledDate}T00:00:00.000Z`);
    const end = new Date(`${query.scheduledDate}T23:59:59.999Z`);
    where.scheduledAt = { [Op.between]: [start, end] };
  }

  // Late Publishing: scheduledAt in the past and not yet Published
  if (query.isLate) {
    where.scheduledAt = { [Op.lt]: new Date() };
    where.status = { [Op.notIn]: ["Published"] };
  }

  const { count, rows } = await Design.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: includeAll,
    distinct: true,
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getDesignById(id: string, _user?: AuthUser) {
  const item = await Design.findByPk(id, { include: includeAll });
  if (!item) throw new AppError("Design not found", 404);
  return item;
}

export async function createDesign(data: CreateDesignInput, createdBy: string) {
  if (data.playerId) {
    const player = await Player.findByPk(data.playerId);
    if (!player) throw new AppError("Player not found", 404);
  }
  if (data.matchId) {
    const match = await Match.findByPk(data.matchId);
    if (!match) throw new AppError("Match not found", 404);
  }
  if (data.clubId) {
    const club = await Club.findByPk(data.clubId);
    if (!club) throw new AppError("Club not found", 404);
  }

  return Design.create({ ...data, createdBy });
}

export async function createQuickContent(
  data: QuickContentInput,
  createdBy: string,
) {
  const title =
    data.title?.trim() ||
    `${data.type} — ${new Date().toLocaleDateString("en-SA")}`;
  return Design.create({
    title,
    type: data.type,
    platforms: data.platforms,
    copyAr: data.copyAr,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    ownerId: data.ownerId ?? null,
    status: "Drafting",
    createdBy,
  });
}

export async function updateDesign(id: string, data: UpdateDesignInput) {
  const item = await getDesignById(id);
  return item.update(data);
}

export async function deleteDesign(id: string) {
  const item = await getDesignById(id);
  await item.destroy();
  return { id };
}

export async function submitForApproval(id: string, user: AuthUser) {
  const item = await getDesignById(id);
  const updated = await item.update({ status: "PendingApproval" });

  // Notify approver if set, otherwise notify Admins/Managers
  if (item.approverId) {
    createNotification({
      userId: item.approverId,
      type: "task",
      title: `Content pending your approval: ${item.title}`,
      titleAr: `محتوى بانتظار موافقتك: ${item.title}`,
      body: `Submitted by ${user.fullName}`,
      link: `/designer-hub/approvals`,
      sourceType: "designs",
      sourceId: item.id,
      priority: "high",
    }).catch(() => {});
  } else {
    notifyByRole(["Admin", "Manager", "ContentManager"], {
      type: "task",
      title: `Content pending approval: ${item.title}`,
      titleAr: `محتوى بانتظار الموافقة: ${item.title}`,
      link: `/designer-hub/approvals`,
      sourceType: "designs",
      sourceId: item.id,
      priority: "high",
    }).catch(() => {});
  }

  return updated;
}

export async function approveDesign(id: string) {
  const item = await getDesignById(id);
  if (item.status !== "PendingApproval") {
    throw new AppError("Design is not pending approval", 422);
  }
  return item.update({ status: "Approved", reviewNotes: null });
}

export async function requestChanges(
  id: string,
  data: ReviewNotesInput,
  user: AuthUser,
) {
  const item = await getDesignById(id);
  if (item.status !== "PendingApproval") {
    throw new AppError("Design is not pending approval", 422);
  }
  const updated = await item.update({
    status: "Drafting",
    reviewNotes: data.reviewNotes,
  });

  // Notify owner
  const notifyId = item.ownerId ?? item.createdBy;
  createNotification({
    userId: notifyId,
    type: "task",
    title: `Changes requested on: ${item.title}`,
    titleAr: `تم طلب تعديلات على: ${item.title}`,
    body: data.reviewNotes,
    link: `/designer-hub/board`,
    sourceType: "designs",
    sourceId: item.id,
    priority: "high",
  }).catch(() => {});

  return updated;
}

export async function rejectDesign(id: string, data: ReviewNotesInput) {
  const item = await getDesignById(id);
  if (item.status !== "PendingApproval") {
    throw new AppError("Design is not pending approval", 422);
  }
  const updated = await item.update({
    status: "Rejected",
    reviewNotes: data.reviewNotes,
  });

  const notifyId = item.ownerId ?? item.createdBy;
  createNotification({
    userId: notifyId,
    type: "task",
    title: `Content rejected: ${item.title}`,
    titleAr: `تم رفض المحتوى: ${item.title}`,
    body: data.reviewNotes,
    link: `/designer-hub/board`,
    sourceType: "designs",
    sourceId: item.id,
    priority: "high",
  }).catch(() => {});

  return updated;
}

export async function markPublished(id: string, data: MarkPublishedInput) {
  const item = await getDesignById(id);
  return item.update({
    status: "Published",
    publishedAt: new Date(),
    publishedLink: data.publishedLink ?? item.publishedLink,
  });
}

export async function postponeDesign(id: string) {
  const item = await getDesignById(id);
  return item.update({ status: "Postponed" });
}

export async function uploadDesignAsset(
  id: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
  baseUrl: string,
) {
  const item = await getDesignById(id);

  let width: number | null = null;
  let height: number | null = null;
  if (file.mimetype.startsWith("image/")) {
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(file.buffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      // sharp can fail on HEIC without libheif — leave dims null
    }
  }

  const { uploadFile } = await import("@shared/utils/storage");
  const result = await uploadFile({
    folder: "designs",
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    generateThumbnail: true,
  });

  const assetUrl = result.url.startsWith("http")
    ? result.url
    : `${baseUrl}${result.url}`;

  return item.update({ assetUrl, assetWidth: width, assetHeight: height });
}

// Kept as alias for backwards-compat (existing mobile/app calls)
export async function publishDesign(id: string) {
  return markPublished(id, {});
}

// ── Cron helpers ──

export async function getLatePublishingItems() {
  return Design.findAll({
    where: {
      scheduledAt: { [Op.lt]: new Date() },
      status: { [Op.notIn]: ["Published", "Postponed", "Rejected"] },
    },
    attributes: ["id", "title", "ownerId", "createdBy", "scheduledAt"],
  });
}

export async function getUpcomingScheduled(withinMinutes: number) {
  const from = new Date();
  const to = new Date(Date.now() + withinMinutes * 60 * 1000);
  return Design.findAll({
    where: {
      scheduledAt: { [Op.between]: [from, to] },
      status: { [Op.in]: ["Approved", "Scheduled"] },
    },
    attributes: ["id", "title", "ownerId", "createdBy", "scheduledAt"],
  });
}
