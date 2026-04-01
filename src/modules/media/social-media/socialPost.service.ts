import { Op } from "sequelize";
import { SocialPost } from "./socialPost.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { Match } from "@modules/matches/match.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import {
  CreateSocialPostInput,
  UpdateSocialPostInput,
  UpdateSocialPostStatusInput,
} from "./socialPost.validation";

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
    model: Match,
    as: "match",
    attributes: ["id", "matchDate"],
    required: false,
  },
  {
    model: User,
    as: "creator",
    attributes: ["id", "fullName"],
    required: false,
  },
];

// ── Status Transitions ──

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["scheduled", "published"],
  scheduled: ["draft", "published"],
  published: ["archived"],
  archived: ["draft"],
};

// ── List ──

export async function listSocialPosts(queryParams: Record<string, unknown>) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "created_at",
  );

  const where: Record<string, unknown> = {};

  if (queryParams.postType) where.postType = queryParams.postType;
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.clubId) where.clubId = queryParams.clubId;

  if (search) {
    where[Op.or as unknown as string] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { titleAr: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await SocialPost.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getSocialPostById(id: string) {
  const post = await SocialPost.findByPk(id, { include: INCLUDES });
  if (!post) throw new AppError("Social media post not found", 404);
  return post;
}

// ── Create ──

export async function createSocialPost(
  data: CreateSocialPostInput,
  userId: string,
) {
  const post = await SocialPost.create({
    ...data,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    createdBy: userId,
  });
  return getSocialPostById(post.id);
}

// ── Update ──

export async function updateSocialPost(
  id: string,
  data: UpdateSocialPostInput,
) {
  const post = await getSocialPostById(id);
  if (post.status === "published" || post.status === "archived") {
    throw new AppError("Cannot edit a published or archived post", 400);
  }
  await post.update({
    ...data,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
  });
  return getSocialPostById(id);
}

// ── Update Status ──

export async function updateSocialPostStatus(
  id: string,
  data: UpdateSocialPostStatusInput,
) {
  const post = await getSocialPostById(id);
  const allowed = STATUS_TRANSITIONS[post.status] || [];

  if (!allowed.includes(data.status)) {
    throw new AppError(
      `Cannot transition from "${post.status}" to "${data.status}"`,
      400,
    );
  }

  const updates: Record<string, unknown> = { status: data.status };
  if (data.status === "published") updates.publishedAt = new Date();

  await post.update(updates);
  return getSocialPostById(id);
}

// ── Delete ──

export async function deleteSocialPost(id: string) {
  const post = await getSocialPostById(id);
  if (post.status === "published") {
    throw new AppError(
      "Cannot delete a published post — archive it first",
      400,
    );
  }
  await post.destroy();
}
