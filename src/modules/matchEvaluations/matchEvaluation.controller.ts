import type { Response } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import * as service from "./matchEvaluation.service";
import type {
  ListMatchEvaluationsQuery,
  CreateMatchEvaluationDTO,
  UpdateMatchEvaluationDTO,
  CreateEvaluationReferralDTO,
} from "./matchEvaluation.validation";

// ── List ──

export async function list(req: AuthRequest, res: Response) {
  const result = await service.listEvaluations(
    req.query as unknown as ListMatchEvaluationsQuery,
    req.user,
  );
  return sendPaginated(res, result.data, result.meta);
}

// ── Get by ID ──

export async function getById(req: AuthRequest, res: Response) {
  const evaluation = await service.getEvaluationById(req.params.id, req.user);
  return sendSuccess(res, evaluation);
}

// ── Create ──

export async function create(req: AuthRequest, res: Response) {
  const evaluation = await service.createEvaluation(
    req.body as CreateMatchEvaluationDTO,
    req.user!.id,
  );
  return sendCreated(res, evaluation, "Evaluation created");
}

// ── Update ──

export async function update(req: AuthRequest, res: Response) {
  const evaluation = await service.updateEvaluation(
    req.params.id,
    req.body as UpdateMatchEvaluationDTO,
    req.user!,
  );
  return sendSuccess(res, evaluation, "Evaluation updated");
}

// ── Submit ──

export async function submit(req: AuthRequest, res: Response) {
  const { summary, recommendation } = req.body as {
    summary: string;
    recommendation: string;
  };
  const evaluation = await service.submitEvaluation(
    req.params.id,
    summary,
    recommendation,
    req.user!,
  );
  return sendSuccess(res, evaluation, "Evaluation submitted for review");
}

// ── Approve ──

export async function approve(req: AuthRequest, res: Response) {
  const evaluation = await service.approveEvaluation(req.params.id, req.user!);
  return sendSuccess(res, evaluation, "Evaluation approved");
}

// ── Request Revision ──

export async function revise(req: AuthRequest, res: Response) {
  const { comment } = req.body as { comment: string };
  const evaluation = await service.requestRevision(
    req.params.id,
    comment,
    req.user!,
  );
  return sendSuccess(res, evaluation, "Revision requested");
}

// ── Create Referral from Evaluation ──

export async function createReferral(req: AuthRequest, res: Response) {
  const evaluation = await service.createReferralFromEvaluation(
    req.params.id,
    req.body as CreateEvaluationReferralDTO,
    req.user!,
  );
  return sendCreated(res, evaluation, "Referral created");
}

// ── Delete ──

export async function remove(req: AuthRequest, res: Response) {
  const result = await service.deleteEvaluation(req.params.id, req.user!);
  return sendSuccess(res, result, "Evaluation deleted");
}

// ── Player Performance Summary ──

export async function getPlayerPerformanceSummary(
  req: AuthRequest,
  res: Response,
) {
  const summary = await service.getPlayerPerformanceSummary(
    req.params.playerId,
  );
  return sendSuccess(res, summary);
}
