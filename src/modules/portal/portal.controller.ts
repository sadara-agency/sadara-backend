import { Response } from "express";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { AppError } from "@middleware/errorHandler";
import { AuthRequest } from "@shared/types";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import { uploadFile } from "@shared/utils/storage";
import * as portalService from "@modules/portal/portal.service";
import * as documentService from "@modules/documents/document.service";

// ── My Profile ──

export async function getMyProfile(req: AuthRequest, res: Response) {
  const data = await portalService.getMyProfile(req.user!.id);
  sendSuccess(res, data);
}

// ── My Schedule ──

export async function getMySchedule(req: AuthRequest, res: Response) {
  const data = await portalService.getMySchedule(req.user!.id, req.query);
  sendSuccess(res, data);
}

// ── My Documents ──

export async function getMyDocuments(req: AuthRequest, res: Response) {
  const data = await portalService.getMyDocuments(req.user!.id);
  sendSuccess(res, data);
}

// ── My Development Plan ──

export async function getMyDevelopment(req: AuthRequest, res: Response) {
  const data = await portalService.getMyDevelopment(req.user!.id);
  sendSuccess(res, data);
}

// ── My Stats ──

export async function getMyStats(req: AuthRequest, res: Response) {
  const data = await portalService.getMyStats(req.user!.id);
  sendSuccess(res, data);
}

// ── My Contracts ──

export async function getMyContracts(req: AuthRequest, res: Response) {
  const data = await portalService.getMyContracts(req.user!.id);
  sendSuccess(res, data);
}

// ── Sign My Contract (Player digital/upload sign) ──

export async function signMyContract(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { action, signatureData, signedDocumentUrl } = req.body;
  const contract = await portalService.signMyContract(
    req.user!.id,
    id,
    action,
    signatureData,
    signedDocumentUrl,
  );
  await logAudit(
    "UPDATE",
    "contracts",
    id,
    buildAuditContext(req.user!, req.ip),
    `Player signed contract via portal (method: ${action})`,
  );
  invalidateMultiple([CachePrefix.PORTAL, CachePrefix.CONTRACTS]).catch(
    () => {},
  );
  sendSuccess(res, contract, "Contract signed successfully");
}

// ── Generate Invite Link (Admin/Manager only) ──

export async function generateInvite(req: AuthRequest, res: Response) {
  const { playerId } = req.body;
  const data = await portalService.generatePlayerInvite(playerId, req.user!.id);
  await logAudit(
    "CREATE",
    "users",
    null,
    buildAuditContext(req.user!, req.ip),
    `Generated player portal invite for ${data.playerName} (${data.playerEmail})`,
  );
  sendCreated(res, data);
}

// ── Upload My Document ──

const ALLOWED_DOC_TYPES = ["ID", "Passport", "Medical"];

export async function uploadMyDocument(req: AuthRequest, res: Response) {
  const player = await portalService.getLinkedPlayer(req.user!.id);
  if (!req.file) throw new AppError("No file provided", 400);

  const docType = req.body.type;
  if (!docType || !ALLOWED_DOC_TYPES.includes(docType)) {
    throw new AppError(
      `Document type must be one of: ${ALLOWED_DOC_TYPES.join(", ")}`,
      400,
    );
  }

  const doc = await documentService.createDocument(
    {
      playerId: player.id,
      name: req.body.name || req.file.originalname,
      type: docType,
      status: "Pending",
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    },
    req.user!.id,
  );

  await logAudit(
    "CREATE",
    "documents",
    doc?.id ?? null,
    buildAuditContext(req.user!, req.ip),
    `Player uploaded document: ${req.body.name || req.file.originalname} (${docType})`,
  );

  invalidateMultiple([CachePrefix.PORTAL]).catch(() => {});
  sendCreated(res, doc, "Document uploaded successfully");
}

// ── Update My Profile ──

export async function updateMyProfile(req: AuthRequest, res: Response) {
  const data = await portalService.updateMyProfile(req.user!.id, req.body);
  await logAudit(
    "UPDATE",
    "players",
    (data as any).id ?? null,
    buildAuditContext(req.user!, req.ip),
    "Player updated profile via portal",
  );
  invalidateMultiple([CachePrefix.PORTAL]).catch(() => {});
  sendSuccess(res, data, "Profile updated");
}

// ── My Injuries ──

export async function getMyInjuries(req: AuthRequest, res: Response) {
  const data = await portalService.getMyInjuries(req.user!.id);
  sendSuccess(res, data);
}

// ── Complete Registration (public — no auth) ──

export async function completeRegistration(req: AuthRequest, res: Response) {
  const { token, password } = req.body;
  const data = await portalService.completePlayerRegistration(token, password);
  sendSuccess(res, data);
}

// ── Admin: List Player Accounts ──

export async function listPlayerAccounts(_req: AuthRequest, res: Response) {
  const data = await portalService.listPlayerAccounts();
  sendSuccess(res, data);
}

// ── Admin: Update Player Account ──

export async function updatePlayerAccount(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = await portalService.updatePlayerAccount(id, req.body);
  logAudit(
    "UPDATE",
    "player_accounts",
    id,
    buildAuditContext(req.user!, req.ip),
    `Updated player account: ${data.email}`,
  );
  invalidateMultiple([CachePrefix.PORTAL]).catch(() => {});
  sendSuccess(res, data, "Player account updated");
}

// ── Admin: Delete Player Account ──

export async function deletePlayerAccount(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = await portalService.deletePlayerAccount(id);
  await logAudit(
    "DELETE",
    "users",
    id,
    buildAuditContext(req.user!, req.ip),
    "Deleted player account",
  );
  invalidateMultiple([CachePrefix.PORTAL]).catch(() => {});
  sendSuccess(res, data, "Player account deleted");
}

// ── Request Profile Link (Player taps "Notify my agent") ──

export async function requestProfileLink(req: AuthRequest, res: Response) {
  const data = await portalService.requestProfileLink(req.user!.id);
  await logAudit(
    "CREATE",
    "notifications",
    null,
    buildAuditContext(req.user!, req.ip),
    `Player portal: profile-link request notified ${data.notified} ${data.target}`,
  );
  sendSuccess(res, data, "Request sent");
}

// ── Upload Signed Contract document (Player only, step before sign/upload) ──

export async function uploadSignedContractFile(
  req: AuthRequest,
  res: Response,
) {
  const { id } = req.params;
  if (!req.file) throw new AppError("No file provided", 400);

  // Verify contract belongs to this player before accepting the upload
  const player = await portalService.getLinkedPlayer(req.user!.id);
  await portalService.verifyContractOwnership(player.id, id);

  const result = await uploadFile({
    folder: "signed-contracts",
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    buffer: req.file.buffer,
    generateThumbnail: false,
  });

  await logAudit(
    "UPDATE",
    "contracts",
    id,
    buildAuditContext(req.user!, req.ip),
    `Player uploaded signed contract document (${req.file.originalname})`,
  );

  sendCreated(res, { url: result.url, key: result.key });
}

// ── Admin: Resend Invite ──

export async function resendInvite(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const data = await portalService.resendPlayerInvite(id);
  await logAudit(
    "UPDATE",
    "users",
    id,
    buildAuditContext(req.user!, req.ip),
    `Resent player invite to ${data.email}`,
  );
  sendSuccess(res, data, "Invite resent");
}
