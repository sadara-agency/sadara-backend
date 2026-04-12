import { WhereOptions } from "sequelize";
import { VideoClip, VideoTag } from "./video.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { uploadFile } from "@shared/utils/storage";
import type {
  CreateClipDTO,
  UpdateClipDTO,
  ListClipsQuery,
  CreateTagDTO,
  UpdateTagDTO,
} from "./video.validation";

// ── Clips ──

export async function listClips(query: ListClipsQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const where: WhereOptions = {};

  if (query.matchId) where.matchId = query.matchId;
  if (query.playerId) where.playerId = query.playerId;
  if (query.status) where.status = query.status;

  const { rows, count } = await VideoClip.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Player,
        as: "player",
        attributes: ["id", "fullName", "fullNameAr"],
      },
      {
        model: User,
        as: "uploader",
        attributes: ["id", "firstName", "lastName"],
      },
      {
        model: VideoTag,
        as: "tags",
        separate: true,
        order: [["timestampSec", "ASC"]],
      },
    ],
  });

  return {
    data: rows,
    meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  };
}

export async function getClipById(id: string) {
  const clip = await VideoClip.findByPk(id, {
    include: [
      {
        model: Player,
        as: "player",
        attributes: ["id", "fullName", "fullNameAr"],
      },
      {
        model: User,
        as: "uploader",
        attributes: ["id", "firstName", "lastName"],
      },
      {
        model: VideoTag,
        as: "tags",

        separate: true,
        order: [["timestampSec", "ASC"]],
      } as any,
    ],
  });
  if (!clip) throw new AppError("Video clip not found", 404);
  return clip;
}

export async function createClip(data: CreateClipDTO, userId: string) {
  return VideoClip.create({
    ...data,
    storageProvider: data.storageProvider ?? "external",
    uploadedBy: userId,
  });
}

export async function updateClip(id: string, data: UpdateClipDTO) {
  const clip = await getClipById(id);
  return clip.update(data);
}

export async function deleteClip(id: string) {
  const clip = await getClipById(id);
  await clip.destroy();
  return { id };
}

// ── Upload video file to GCS/local storage ──

export async function uploadVideoFile(
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  },
  meta: { title: string; playerId?: string; matchId?: string },
  userId: string,
) {
  const result = await uploadFile({
    folder: "video-clips",
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    generateThumbnail: false,
  });

  return VideoClip.create({
    title: meta.title,
    playerId: meta.playerId ?? null,
    matchId: meta.matchId ?? null,
    storageProvider: "gcs",
    storagePath: result.key,
    externalUrl: result.url,
    mimeType: result.mimeType,
    fileSizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
    status: "ready",
    uploadedBy: userId,
  });
}

// ── Tags ──

export async function listTagsForClip(clipId: string) {
  // Verify clip exists
  await getClipById(clipId);
  return VideoTag.findAll({
    where: { clipId },
    order: [["timestampSec", "ASC"]],
  });
}

export async function getTagById(id: string) {
  const tag = await VideoTag.findByPk(id);
  if (!tag) throw new AppError("Video tag not found", 404);
  return tag;
}

export async function createTag(
  clipId: string,
  data: CreateTagDTO,
  userId: string,
) {
  // Verify clip exists
  await getClipById(clipId);
  return VideoTag.create({ ...data, clipId, createdBy: userId });
}

export async function updateTag(id: string, data: UpdateTagDTO) {
  const tag = await getTagById(id);
  return tag.update(data);
}

export async function deleteTag(id: string) {
  const tag = await getTagById(id);
  await tag.destroy();
  return { id };
}

// ── Tag summary ──

export async function getTagSummaryForClip(clipId: string) {
  const tags = await VideoTag.findAll({ where: { clipId } });

  const byType: Record<string, number> = {};
  for (const tag of tags) {
    byType[tag.tagType] = (byType[tag.tagType] ?? 0) + 1;
  }

  return {
    total: tags.length,
    byType,
    tags,
  };
}
