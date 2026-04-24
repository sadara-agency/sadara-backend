import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import * as service from "./watchlist-video-clip.service";

export async function list(req: AuthRequest, res: Response) {
  const { watchlistId } = req.params;
  const clips = await service.listVideoClips(watchlistId);
  sendSuccess(res, clips);
}

export async function addLink(req: AuthRequest, res: Response) {
  const { watchlistId } = req.params;
  const clip = await service.addVideoClipLink(
    watchlistId,
    req.body,
    req.user!.id,
  );
  sendCreated(res, clip, "Video clip added");
}

export async function upload(req: AuthRequest, res: Response) {
  const { watchlistId } = req.params;
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file provided" });
    return;
  }
  const title = typeof req.body.title === "string" ? req.body.title : undefined;
  const clip = await service.addVideoClipUpload(
    watchlistId,
    req.file,
    title,
    req.user!.id,
  );
  sendCreated(res, clip, "Video clip uploaded");
}

export async function remove(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const result = await service.deleteVideoClip(id);
  sendSuccess(res, result, "Video clip deleted");
}
