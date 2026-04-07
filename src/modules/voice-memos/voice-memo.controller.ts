import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import * as svc from "./voice-memo.service";

export async function list(req: AuthRequest, res: Response) {
  const { ownerType, ownerId } = req.query as Record<string, string>;
  const memos = await svc.listVoiceMemos(ownerType, ownerId);
  sendSuccess(res, memos);
}

export async function create(req: AuthRequest, res: Response) {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No audio file uploaded" });
    return;
  }

  const { ownerType, ownerId, durationSeconds } = req.body;
  const memo = await svc.createVoiceMemo(
    ownerType,
    ownerId,
    parseInt(durationSeconds, 10),
    req.file,
    req.user!.id,
  );
  sendCreated(res, memo);
}

export async function remove(req: AuthRequest, res: Response) {
  const result = await svc.deleteVoiceMemo(req.params.id, req.user!.id);
  sendSuccess(res, result, "Voice memo deleted");
}
