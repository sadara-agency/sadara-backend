import { Op } from "sequelize";
import { PressRelease } from "./pressRelease.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  CreatePressReleaseInput,
  UpdatePressReleaseInput,
  UpdatePressReleaseStatusInput,
} from "./pressRelease.schema";

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
  const slug = generateSlug(data.title);
  return PressRelease.create({ ...data, slug, createdBy: userId });
}

// ── Update ──

export async function updatePressRelease(
  id: string,
  data: UpdatePressReleaseInput,
) {
  const release = await PressRelease.findByPk(id);
  if (!release) throw new AppError("Press release not found", 404);

  // Regenerate slug if title changed
  const updatePayload: Record<string, unknown> = { ...data };
  if (data.title && data.title !== release.title) {
    updatePayload.slug = generateSlug(data.title);
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

  return release.update(updatePayload);
}

// ── Delete ──

export async function deletePressRelease(id: string) {
  const release = await PressRelease.findByPk(id);
  if (!release) throw new AppError("Press release not found", 404);
  await release.destroy();
  return { id };
}
