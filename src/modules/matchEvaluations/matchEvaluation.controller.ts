import { Request, Response } from "express";
import { asyncHandler } from "@middleware/errorHandler";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import * as service from "./matchEvaluation.service";
import type { ListMatchEvaluationsDTO } from "./matchEvaluation.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { data, meta } = await service.listEvaluations(
    req.query as unknown as ListMatchEvaluationsDTO,
  );
  sendPaginated(res, data, meta);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const evaluation = await service.getEvaluationById(req.params.id);
  sendSuccess(res, evaluation);
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const evaluation = await service.createEvaluation(req.body, req.user!.id);
  sendCreated(res, evaluation, "Evaluation created");
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const evaluation = await service.updateEvaluation(
    req.params.id,
    req.body,
    req.user!.id,
  );
  sendSuccess(res, evaluation, "Evaluation updated");
});

export const submit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const evaluation = await service.submitEvaluation(
    req.params.id,
    req.user!.id,
  );
  sendSuccess(res, evaluation, "Evaluation submitted for review");
});

export const approve = asyncHandler(async (req: AuthRequest, res: Response) => {
  const evaluation = await service.approveEvaluation(
    req.params.id,
    req.user!.id,
  );
  sendSuccess(res, evaluation, "Evaluation approved");
});

export const requestRevision = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const evaluation = await service.requestRevision(
      req.params.id,
      req.body.revisionComment,
      req.user!.id,
    );
    sendSuccess(res, evaluation, "Revision requested");
  },
);

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await service.deleteEvaluation(req.params.id, req.user!.id);
  sendSuccess(res, result, "Evaluation deleted");
});

export const getPlayerSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const summary = await service.getPlayerSummary(req.params.playerId);
    sendSuccess(res, summary);
  },
);
