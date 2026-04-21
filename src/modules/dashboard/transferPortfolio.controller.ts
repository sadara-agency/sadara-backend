import { asyncHandler } from "@middleware/errorHandler";
import { sendSuccess } from "@shared/utils/apiResponse";
import { getTransferFrameworkStats } from "./transferPortfolio.service";
import type { AuthRequest } from "@shared/types";
import type { Response } from "express";

export const getStats = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const windowId =
      typeof req.query.windowId === "string" ? req.query.windowId : undefined;
    const stats = await getTransferFrameworkStats(windowId);
    return sendSuccess(res, stats);
  },
);
