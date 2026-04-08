import { VoiceMemo } from "./voice-memo.model";
import { uploadFile, resolveFileUrl } from "@shared/utils/storage";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";

async function safeResolveUrl(key: string): Promise<string> {
  try {
    return await resolveFileUrl(key, 60);
  } catch (err) {
    logger.warn(`[voice-memos] Failed to resolve signed URL for ${key}`, err);
    return key;
  }
}

export async function listVoiceMemos(ownerType: string, ownerId: string) {
  const memos = await VoiceMemo.findAll({
    where: { ownerType, ownerId },
    order: [["createdAt", "DESC"]],
  });

  // Resolve signed URLs for each memo
  const resolved = await Promise.all(
    memos.map(async (m) => {
      const url = await safeResolveUrl(m.fileUrl);
      return {
        id: m.id,
        ownerType: m.ownerType,
        ownerId: m.ownerId,
        fileUrl: url,
        fileSize: m.fileSize,
        mimeType: m.mimeType,
        durationSeconds: m.durationSeconds,
        recordedBy: m.recordedBy,
        createdAt: m.createdAt,
      };
    }),
  );

  return resolved;
}

export async function createVoiceMemo(
  ownerType: string,
  ownerId: string,
  durationSeconds: number,
  file: { buffer: Buffer; originalname: string; mimetype: string },
  userId: string,
) {
  if (durationSeconds > 300) {
    throw new AppError("Voice memo cannot exceed 5 minutes", 400);
  }

  const result = await uploadFile({
    folder: "voice-memos",
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    generateThumbnail: false,
  });

  const memo = await VoiceMemo.create({
    ownerType,
    ownerId,
    fileUrl: result.key,
    fileSize: result.size,
    mimeType: result.mimeType,
    durationSeconds,
    recordedBy: userId,
  });

  return {
    ...memo.toJSON(),
    fileUrl: await safeResolveUrl(memo.fileUrl),
  };
}

export async function deleteVoiceMemo(id: string, userId: string) {
  const memo = await VoiceMemo.findByPk(id);
  if (!memo) throw new AppError("Voice memo not found", 404);
  if (memo.recordedBy !== userId) {
    throw new AppError("You can only delete your own voice memos", 403);
  }
  await memo.destroy();
  return { id };
}
