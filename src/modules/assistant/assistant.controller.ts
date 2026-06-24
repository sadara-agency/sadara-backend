import type { Response } from "express";
import type { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { AppError } from "@middleware/errorHandler";
import { runChat } from "./assistant.service";
import type { ChatDTO } from "./assistant.validation";

export async function chat(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) throw new AppError("Unauthorized", 401);
  const { message, history } = req.body as ChatDTO;

  const result = await runChat({ message, history, user: req.user });

  sendSuccess(res, result);
}
