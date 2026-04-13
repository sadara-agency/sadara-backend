import { Request, Response } from "express";
import { AuthRequest } from "@shared/types";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "@shared/utils/apiResponse";
import { resolveFileUrl } from "@shared/utils/storage";
import * as svc from "./esignature.service";

/** Resolve document.fileUrl to an accessible URL (signed URL for private GCS keys) */
async function resolveDocUrl(obj: any): Promise<void> {
  const doc = obj?.document || obj?.dataValues?.document;
  if (doc) {
    const raw = doc.fileUrl || doc.dataValues?.fileUrl;
    if (raw) {
      const resolved = await resolveFileUrl(raw, 30);
      if (doc.dataValues) doc.dataValues.fileUrl = resolved;
      else doc.fileUrl = resolved;
    }
  }
}

// ── Create signature request ──
export async function create(req: AuthRequest, res: Response) {
  const result = await svc.createSignatureRequest(req.body, req.user!);
  sendCreated(res, result);
}

// ── List signature requests ──
export async function list(req: AuthRequest, res: Response) {
  const r = await svc.listRequests(
    req.query as any,
    req.user!.id,
    req.user!.role,
  );
  sendPaginated(res, r.data, r.meta);
}

// ── Get by ID ──
export async function getById(req: AuthRequest, res: Response) {
  const result = await svc.getRequestById(req.params.id);
  await resolveDocUrl(result);
  sendSuccess(res, result);
}

// ── Cancel ──
export async function cancel(req: AuthRequest, res: Response) {
  const result = await svc.cancelRequest(req.params.id, req.user!.id);
  sendSuccess(res, result);
}

// ── Submit signature (authenticated internal user) ──
export async function submitAuth(req: AuthRequest, res: Response) {
  const ip =
    (req.headers["x-forwarded-for"] as string) ||
    req.socket.remoteAddress ||
    "";
  const ua = req.headers["user-agent"] || "";
  const result = await svc.submitSignature(
    req.params.signerId,
    req.body,
    ip,
    ua,
  );
  sendSuccess(res, result);
}

// ── Decline (authenticated) ──
export async function declineAuth(req: AuthRequest, res: Response) {
  const ip =
    (req.headers["x-forwarded-for"] as string) ||
    req.socket.remoteAddress ||
    "";
  const ua = req.headers["user-agent"] || "";
  const result = await svc.declineSignature(
    req.params.signerId,
    req.body?.reason,
    ip,
    ua,
  );
  sendSuccess(res, result);
}

// ── Remind signer ──
export async function remind(req: AuthRequest, res: Response) {
  const result = await svc.remindSigner(req.params.signerId, req.user!.id);
  sendSuccess(res, result);
}

// ── Audit trail ──
export async function getAuditTrail(req: AuthRequest, res: Response) {
  const result = await svc.getAuditTrail(req.params.id);
  sendSuccess(res, result);
}

// ── My pending signatures ──
export async function getMyPending(req: AuthRequest, res: Response) {
  const result = await svc.getMyPendingSignatures(req.user!.id);
  sendSuccess(res, result);
}

// ── Public: view by token ──
export async function viewByToken(req: Request, res: Response) {
  const { signer, request } = await svc.verifySigningToken(req.params.token);
  await resolveDocUrl(request);
  sendSuccess(res, { signer, request });
}

// ── Public: submit by token ──
export async function submitByToken(req: Request, res: Response) {
  const { signer } = await svc.verifySigningToken(req.params.token);
  const ip =
    (req.headers["x-forwarded-for"] as string) ||
    req.socket.remoteAddress ||
    "";
  const ua = req.headers["user-agent"] || "";
  const result = await svc.submitSignature(signer.id, req.body, ip, ua);
  sendSuccess(res, result);
}

// ── Public: decline by token ──
export async function declineByToken(req: Request, res: Response) {
  const { signer } = await svc.verifySigningToken(req.params.token);
  const ip =
    (req.headers["x-forwarded-for"] as string) ||
    req.socket.remoteAddress ||
    "";
  const ua = req.headers["user-agent"] || "";
  const result = await svc.declineSignature(
    signer.id,
    req.body?.reason,
    ip,
    ua,
  );
  sendSuccess(res, result);
}
