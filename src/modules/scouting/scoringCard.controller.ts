import { asyncHandler } from "@middleware/errorHandler";
import { sendSuccess, sendPaginated } from "@shared/utils/apiResponse";
import * as svc from "@modules/scouting/scoringCard.service";
import type { AuthRequest } from "@shared/types";

export const listScoringCards = asyncHandler(async (req: AuthRequest, res) => {
  const result = await svc.listScoringCards(req.query as any);
  return sendPaginated(res, result.data, result.meta);
});

export const getScoringCard = asyncHandler(async (req: AuthRequest, res) => {
  const card = await svc.getScoringCardById(req.params.id);
  return sendSuccess(res, card);
});

export const upsertScoringCard = asyncHandler(async (req: AuthRequest, res) => {
  const card = await svc.upsertScoringCard(req.body, req.user!.id);
  return sendSuccess(res, card, "Scoring card saved");
});

export const deleteScoringCard = asyncHandler(async (req: AuthRequest, res) => {
  const result = await svc.deleteScoringCard(req.params.id);
  return sendSuccess(res, result, "Scoring card deleted");
});
