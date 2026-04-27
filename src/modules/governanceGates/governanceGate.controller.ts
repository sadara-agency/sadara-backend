import type { Response } from "express";
import type { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { verifyAuditChain } from "@shared/utils/audit";
import * as service from "./governanceGate.service";

export async function list(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.listGates(
    req.query as Record<string, string & number>,
  );
  sendPaginated(res, result.data, result.meta);
}

export async function getById(req: AuthRequest, res: Response): Promise<void> {
  const gate = await service.getGateById(req.params.id);
  sendSuccess(res, gate);
}

export async function trigger(req: AuthRequest, res: Response): Promise<void> {
  const gate = await service.triggerGate(req.body, req.user!);
  sendCreated(res, gate);
}

export async function resolve(req: AuthRequest, res: Response): Promise<void> {
  const { action, reviewerNotes } = req.body as {
    action: "approve" | "reject" | "bypass";
    reviewerNotes?: string;
  };
  const gate = await service.resolveGate(
    req.params.id,
    action,
    reviewerNotes,
    req.user!,
  );
  sendSuccess(res, gate);
}

export async function remove(req: AuthRequest, res: Response): Promise<void> {
  const result = await service.deleteGate(req.params.id);
  sendSuccess(res, result);
}

export async function verifyChain(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const limit = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : 1000;
  const result = await verifyAuditChain(limit);
  sendSuccess(res, result);
}
