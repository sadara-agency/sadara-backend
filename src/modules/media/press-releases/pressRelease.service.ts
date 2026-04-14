import { Op } from "sequelize";
import { PressRelease } from "./pressRelease.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  createNotification,
  notifyByRole,
} from "@modules/notifications/notification.service";
import { logger } from "@config/logger";
import {
  CreatePressReleaseInput,
  UpdatePressReleaseInput,
  UpdatePressReleaseStatusInput,
} from "./pressRelease.validation";

// ── Valid status transitions ──

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["review"],
  review: ["approved", "draft"],
  approved: ["published", "draft"],
  published: ["archived"],
  archived: ["draft"],
};

// ── Slug generator ──

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200)
    .concat("-", Date.now().toString(36));
}

// ── Includes ──

const INCLUDES = [
  {
    model: Player,
    as: "player",
    attributes: ["id", "firstName", "lastName", "photoUrl"],
    required: false,
  },
  {
    model: Club,
    as: "club",
    attributes: ["id", "name", "nameAr", "logoUrl"],
    required: false,
  },
  {
    model: User,
    as: "author",
    attributes: ["id", "fullName"],
    required: false,
  },
  {
    model: User,
    as: "reviewer",
    attributes: ["id", "fullName"],
    required: false,
  },
  {
    model: User,
    as: "approver",
    attributes: ["id", "fullName"],
    required: false,
  },
];

// ── List ──

export async function listPressReleases(queryParams: Record<string, unknown>) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "created_at",
  );

  const where: Record<string, unknown> = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.category) where.category = queryParams.category;

  if (search) {
    where[Op.or as unknown as string] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { titleAr: { [Op.iLike]: `%${search}%` } },
      { excerptEn: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await PressRelease.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: INCLUDES,
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getPressReleaseById(id: string) {
  const release = await PressRelease.findByPk(id, { include: INCLUDES });
  if (!release) throw new AppError("Press release not found", 404);
  return release;
}

// ── Get by Slug ──

export async function getPressReleaseBySlug(slug: string) {
  const release = await PressRelease.findOne({
    where: { slug },
    include: INCLUDES,
  });
  if (!release) throw new AppError("Press release not found", 404);
  return release;
}

// ── Create ──

export async function createPressRelease(
  data: CreatePressReleaseInput,
  userId: string,
) {
  // Bilingual fallback: the DB column `title` is NOT NULL. Users may submit
  // only Arabic (RTL mode) or only English — coalesce the missing side so the
  // column is always populated.
  const title = data.title?.trim() || data.titleAr?.trim() || "";
  const slug = generateSlug(title);
  return PressRelease.create({
    ...data,
    title,
    slug,
    createdBy: userId,
  });
}

// ── Update ──

export async function updatePressRelease(
  id: string,
  data: UpdatePressReleaseInput,
) {
  const release = await PressRelease.findByPk(id);
  if (!release) throw new AppError("Press release not found", 404);

  const updatePayload: Record<string, unknown> = { ...data };

  // Bilingual fallback for the NOT NULL title column when caller touches
  // either language side.
  if ("title" in data || "titleAr" in data) {
    const nextTitle = "title" in data ? data.title : release.title;
    const nextTitleAr = "titleAr" in data ? data.titleAr : release.titleAr;
    const resolved = nextTitle?.trim() || nextTitleAr?.trim() || "";
    if (resolved) {
      updatePayload.title = resolved;
      if (resolved !== release.title) {
        updatePayload.slug = generateSlug(resolved);
      }
    }
  }

  return release.update(updatePayload);
}

// ── Update Status ──

export async function updatePressReleaseStatus(
  id: string,
  data: UpdatePressReleaseStatusInput,
  userId: string,
) {
  const release = await PressRelease.findByPk(id);
  if (!release) throw new AppError("Press release not found", 404);

  const allowed = STATUS_TRANSITIONS[release.status];
  if (!allowed || !allowed.includes(data.status)) {
    throw new AppError(
      `Cannot transition from '${release.status}' to '${data.status}'`,
      400,
    );
  }

  const updatePayload: Record<string, unknown> = { status: data.status };

  if (data.status === "review") {
    updatePayload.reviewedBy = null;
    updatePayload.approvedBy = null;
  }
  if (data.status === "approved") {
    updatePayload.approvedBy = userId;
  }
  if (data.status === "published") {
    updatePayload.publishedAt = new Date();
  }

  await release.update(updatePayload);

  // Fire-and-forget notifications
  const statusLabelAr: Record<string, string> = {
    review: "قيد المراجعة",
    approved: "تمت الموافقة",
    published: "منشور",
    archived: "مؤرشف",
    draft: "مسودة",
  };

  const titlePreview =
    release.title.length > 50
      ? release.title.slice(0, 50) + "..."
      : release.title;

  if (data.status === "review") {
    // Notify Managers & Admins that a press release needs review
    notifyByRole(["Admin", "Manager"], {
      type: "system",
      title: `Press release submitted for review: ${titlePreview}`,
      titleAr: `بيان صحفي للمراجعة: ${release.titleAr || titlePreview}`,
      link: "/dashboard/media/press-releases",
      sourceType: "press_release",
      sourceId: release.id,
      priority: "normal",
    }).catch((err) =>
      logger.warn("Press release review notification failed", err),
    );
  } else if (data.status === "approved") {
    createNotification({
      userId: release.createdBy,
      type: "system",
      title: `Your press release was approved: ${titlePreview}`,
      titleAr: `تمت الموافقة على بيانك الصحفي: ${release.titleAr || titlePreview}`,
      link: "/dashboard/media/press-releases",
      sourceType: "press_release",
      sourceId: release.id,
      priority: "normal",
    }).catch((err) =>
      logger.warn("Press release approval notification failed", err),
    );
  } else if (data.status === "published") {
    createNotification({
      userId: release.createdBy,
      type: "system",
      title: `Press release published: ${titlePreview}`,
      titleAr: `تم نشر البيان الصحفي: ${release.titleAr || titlePreview}`,
      link: "/dashboard/media/press-releases",
      sourceType: "press_release",
      sourceId: release.id,
      priority: "normal",
    }).catch((err) =>
      logger.warn("Press release publish notification failed", err),
    );
  }

  return release;
}

// ── Delete ──

export async function deletePressRelease(id: string) {
  const release = await PressRelease.findByPk(id);
  if (!release) throw new AppError("Press release not found", 404);
  await release.destroy();
  return { id };
}
