import WatchlistVideoClip from "./watchlist-video-clip.model";
import { AppError } from "@middleware/errorHandler";
import { uploadFile, deleteFile } from "@shared/utils/storage";
import type { AddVideoClipLinkDTO } from "./watchlist-video-clip.validation";

export async function listVideoClips(watchlistId: string) {
  return WatchlistVideoClip.findAll({
    where: { watchlistId },
    order: [["createdAt", "DESC"]],
  });
}

export async function addVideoClipLink(
  watchlistId: string,
  data: AddVideoClipLinkDTO,
  userId: string,
) {
  return WatchlistVideoClip.create({
    watchlistId,
    clipType: "link",
    url: data.url,
    title: data.title ?? null,
    uploadedBy: userId,
  });
}

export async function addVideoClipUpload(
  watchlistId: string,
  file: Express.Multer.File,
  title: string | undefined,
  userId: string,
) {
  const result = await uploadFile({
    folder: "video-clips",
    originalName: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
    generateThumbnail: false,
  });

  return WatchlistVideoClip.create({
    watchlistId,
    clipType: "upload",
    fileKey: result.key,
    fileUrl: result.url,
    fileSize: result.size,
    mimeType: result.mimeType,
    title: title ?? null,
    uploadedBy: userId,
  });
}

export async function deleteVideoClip(id: string) {
  const clip = await WatchlistVideoClip.findByPk(id);
  if (!clip) throw new AppError("Video clip not found", 404);

  if (clip.clipType === "upload" && clip.fileKey) {
    await deleteFile(clip.fileKey);
  }

  await clip.destroy();
  return { id };
}
