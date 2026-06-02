import type { Response } from "express";
import {
  sendSuccess,
  sendPaginated,
  sendCreated,
} from "@shared/utils/apiResponse";
import type { AuthRequest } from "@shared/types";
import * as postureService from "./postureAssessment.service";
import type { ListPostureAssessmentsQueryDTO } from "./postureAssessment.validation";

export async function list(req: AuthRequest, res: Response): Promise<void> {
  const result = await postureService.listPostureAssessments(
    req.query as ListPostureAssessmentsQueryDTO,
    req.user,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function listForPlayer(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const result = await postureService.listPostureAssessmentsForPlayer(
    req.params.playerId,
    req.query as ListPostureAssessmentsQueryDTO,
    req.user,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getLatestForPlayer(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const data = await postureService.getLatestPostureAssessmentForPlayer(
    req.params.playerId,
    req.user,
  );
  sendSuccess(res, data);
}

export async function getById(req: AuthRequest, res: Response): Promise<void> {
  const data = await postureService.getPostureAssessmentById(
    req.params.id,
    req.user,
  );
  sendSuccess(res, data);
}

export async function create(req: AuthRequest, res: Response): Promise<void> {
  const data = await postureService.createPostureAssessment(
    req.body,
    req.user!.id,
  );
  sendCreated(res, data, "Posture assessment created");
}

export async function update(req: AuthRequest, res: Response): Promise<void> {
  const data = await postureService.updatePostureAssessment(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, data, "Posture assessment updated");
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  const data = await postureService.deletePostureAssessment(
    req.params.id,
    req.user,
  );
  sendSuccess(res, data, "Posture assessment deleted");
}
