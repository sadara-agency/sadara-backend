import { Response } from "express";
import type { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import * as analystHomeService from "./analyst-home.service";

// GET /analyst-home
export async function getAnalystHome(req: AuthRequest, res: Response) {
  const data = await analystHomeService.getAnalystHome(req.user!);
  sendSuccess(res, data);
}
