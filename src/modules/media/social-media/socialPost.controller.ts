import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
import { CachePrefix, invalidateMultiple } from "@shared/utils/cache";
import { uploadFile } from "@shared/utils/storage";
import { AppError } from "@middleware/errorHandler";
import * as socialPostService from "./socialPost.service";

const crud = createCrudController({
  service: {
    list: (query) => socialPostService.listSocialPosts(query),
    getById: (id) => socialPostService.getSocialPostById(id),
    create: (body, userId) => socialPostService.createSocialPost(body, userId),
    update: (id, body) => socialPostService.updateSocialPost(id, body),
    delete: (id) => socialPostService.deleteSocialPost(id),
  },
  entity: "social_media",
  cachePrefixes: [CachePrefix.SOCIAL_POSTS],
  label: (r) => `${r.postType}: ${r.title}`,
});

export const { list, getById, create, update, remove } = crud;

// ── Custom: Update Status ──

export async function updateStatus(req: AuthRequest, res: Response) {
  const post = await socialPostService.updateSocialPostStatus(
    req.params.id,
    req.body,
  );

  await logAudit(
    "UPDATE",
    "social_media",
    post.id,
    buildAuditContext(req.user!, req.ip),
    `Social post status changed to ${post.status}`,
  );

  sendSuccess(res, post, `Status updated to ${post.status}`);
}

// ── Custom: Upload Image ──

export async function uploadImage(req: AuthRequest, res: Response) {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const result = await uploadFile({
    folder: "photos",
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    buffer: req.file.buffer,
    generateThumbnail: true,
  });

  const imageUrl = result.url.startsWith("http")
    ? result.url
    : `${req.protocol}://${req.get("host")}${result.url}`;

  const post = await socialPostService.addImageUrl(req.params.id, imageUrl);

  logAudit(
    "UPDATE",
    "social_media",
    post.id,
    buildAuditContext(req.user!, req.ip),
    "Added image to social post",
  ).catch(() => {});

  invalidateMultiple([CachePrefix.SOCIAL_POSTS]).catch(() => {});

  sendSuccess(res, post, "Image uploaded");
}

// ── Custom: Remove Image ──

export async function removeImage(req: AuthRequest, res: Response) {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index)) throw new AppError("Invalid image index", 400);

  const post = await socialPostService.removeImageUrl(req.params.id, index);

  logAudit(
    "UPDATE",
    "social_media",
    post.id,
    buildAuditContext(req.user!, req.ip),
    `Removed image at index ${index} from social post`,
  ).catch(() => {});

  invalidateMultiple([CachePrefix.SOCIAL_POSTS]).catch(() => {});

  sendSuccess(res, post, "Image removed");
}
