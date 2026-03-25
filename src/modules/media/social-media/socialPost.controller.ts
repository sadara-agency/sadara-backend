import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { createCrudController } from "@shared/utils/crudController";
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
  cachePrefixes: [],
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
