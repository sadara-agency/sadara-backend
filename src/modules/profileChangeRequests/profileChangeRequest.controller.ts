import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendCreated, sendSuccess } from "@shared/utils/apiResponse";
import * as service from "./profileChangeRequest.service";

// ── Submit a profile change for leadership approval (Player only) ──

export async function submit(req: AuthRequest, res: Response) {
  const request = await service.submitProfileChange(req.user!.id, req.body);
  sendCreated(res, request, "Change submitted for approval");
}

// ── List the calling player's own profile-change requests ──

export async function listMine(req: AuthRequest, res: Response) {
  const list = await service.listMyProfileChanges(req.user!.id);
  sendSuccess(res, list);
}
