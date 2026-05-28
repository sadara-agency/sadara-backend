import { WhereOptions, Op } from "sequelize";
import { VideoClip, VideoTag } from "./video.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { uploadFile, resolveFileUrl } from "@shared/utils/storage";
import { getVideoDurationSec } from "@shared/utils/videoDuration";
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

  // Filter to only clips that have at least one tag of this type
  if (query.tagType) {
    const clipIds = await VideoTag.findAll({
      where: { tagType: query.tagType },
      attributes: ["clipId"],
    }).then((tags) => [...new Set(tags.map((t) => t.clipId))]);
    where.id = { [Op.in]: clipIds };
  }

  const { rows, count } = await VideoClip.findAndCountAll({
    where,
    limit,
    offset: (page - 1) * limit,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
      },
      {
        model: User,
        as: "uploader",
        attributes: ["id", "fullName", "fullNameAr"],
      },
      {
        model: VideoTag,
        as: "tags",
        separate: true,
        order: [["timestampSec", "ASC"]],
      },
    ],
  });

  await Promise.all(
    rows.map(async (clip) => {
      const dv = (clip as any).dataValues;
      if (clip.externalUrl)
        dv.externalUrl = await resolveFileUrl(clip.externalUrl);
      if (clip.thumbnailPath)
        dv.thumbnailPath = await resolveFileUrl(clip.thumbnailPath);
    }),
  );

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
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
      },
      {
        model: User,
        as: "uploader",
        attributes: ["id", "fullName", "fullNameAr"],
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

  const dv = (clip as any).dataValues;
  if (clip.externalUrl) dv.externalUrl = await resolveFileUrl(clip.externalUrl);
  if (clip.thumbnailPath)
    dv.thumbnailPath = await resolveFileUrl(clip.thumbnailPath);
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
  // Probe duration from the in-memory buffer before it's uploaded (the buffer
  // is streamed straight to GCS and never hits disk, so do it here).
  const durationSec = getVideoDurationSec(file.buffer, file.mimetype);

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
    storageProvider: "supabase",
    storagePath: result.key,
    externalUrl: result.url,
    mimeType: result.mimeType,
    fileSizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
    durationSec,
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

export async function getTagSummaryByPlayer(playerId: string) {
  const clips = await VideoClip.findAll({
    where: { playerId },
    attributes: ["id"],
  });

  if (clips.length === 0) {
    return { total: 0, byType: {} as Record<string, number> };
  }

  const clipIds = clips.map((c) => c.id);
  const tags = await VideoTag.findAll({ where: { clipId: clipIds } });

  const byType: Record<string, number> = {};
  for (const tag of tags) {
    byType[tag.tagType] = (byType[tag.tagType] ?? 0) + 1;
  }

  return { total: tags.length, byType };
}

export interface TagReviewItem {
  tagId: string;
  tagType: string;
  timestampSec: number | null;
  notes: string | null;
  createdAt: string;
  clipId: string;
  clipTitle: string;
  clipTitleAr: string | null;
}

export async function getTagReviewByPlayer(
  playerId: string,
): Promise<TagReviewItem[]> {
  const clips = await VideoClip.findAll({
    where: { playerId },
    attributes: ["id", "title", "titleAr", "createdAt"],
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: VideoTag,
        as: "tags",
        attributes: ["id", "tagType", "timestampSec", "notes", "createdAt"],
        separate: true,
        order: [["timestampSec", "ASC"]],
      },
    ],
  });

  const result: TagReviewItem[] = [];
  for (const clip of clips) {
    const tags = ((clip as any).tags as VideoTag[]) ?? [];
    for (const tag of tags) {
      result.push({
        tagId: tag.id,
        tagType: tag.tagType,
        timestampSec: tag.timestampSec,
        notes: tag.notes,
        createdAt: tag.createdAt.toISOString(),
        clipId: clip.id,
        clipTitle: clip.title,
        clipTitleAr: clip.titleAr ?? null,
      });
    }
  }
  return result;
}
