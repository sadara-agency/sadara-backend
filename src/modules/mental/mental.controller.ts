import { Response, NextFunction } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { invalidateByPrefix, CachePrefix } from "@shared/utils/cache";
import * as mentalService from "./mental.service";

// ── Templates ──

export async function listTemplates(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const active =
      req.query.active === undefined ? undefined : req.query.active === "true";
    const data = await mentalService.listTemplates(active);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getTemplate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.getTemplateById(req.params.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.createTemplate(req.body, req.user!.id);
    await invalidateByPrefix(CachePrefix.MENTAL_TEMPLATES);
    return sendCreated(res, data, "Template created");
  } catch (err) {
    next(err);
  }
}

export async function updateTemplate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.updateTemplate(req.params.id, req.body);
    await invalidateByPrefix(CachePrefix.MENTAL_TEMPLATES);
    return sendSuccess(res, data, "Template updated");
  } catch (err) {
    next(err);
  }
}

export async function deleteTemplate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.deleteTemplate(req.params.id);
    await invalidateByPrefix(CachePrefix.MENTAL_TEMPLATES);
    return sendSuccess(res, data, "Template deleted");
  } catch (err) {
    next(err);
  }
}

// ── Assessments ──

export async function listAssessments(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await mentalService.listAssessments(
      req.query as never,
      req.user!,
    );
    return sendPaginated(res, result.data, result.meta);
  } catch (err) {
    next(err);
  }
}

export async function getAssessment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.getAssessmentById(
      req.params.id,
      req.user!,
    );
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function createAssessment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.createAssessment(req.body, req.user!.id);
    await invalidateByPrefix(CachePrefix.MENTAL);
    return sendCreated(res, data, "Assessment created");
  } catch (err) {
    next(err);
  }
}

export async function updateAssessment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.updateAssessment(
      req.params.id,
      req.body,
      req.user!,
    );
    await invalidateByPrefix(CachePrefix.MENTAL);
    return sendSuccess(res, data, "Assessment updated");
  } catch (err) {
    next(err);
  }
}

export async function deleteAssessment(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.deleteAssessment(req.params.id, req.user!);
    await invalidateByPrefix(CachePrefix.MENTAL);
    return sendSuccess(res, data, "Assessment deleted");
  } catch (err) {
    next(err);
  }
}

// ── Analytics ──

export async function getTrend(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { playerId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const data = await mentalService.getTrendForPlayer(
      playerId,
      req.user!,
      limit,
    );
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getAlerts(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await mentalService.getAlerts(req.user!);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
