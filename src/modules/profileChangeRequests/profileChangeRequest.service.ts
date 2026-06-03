import { logger } from "@config/logger";
import { AppError } from "@middleware/errorHandler";
import { getLinkedPlayer } from "@modules/portal/portal.service";
import { createApprovalRequest } from "@modules/approvals/approval.service";
import { Player } from "@modules/players/player.model";
import { invalidateMultiple, CachePrefix } from "@shared/utils/cache";
import {
  ProfileChangeRequest,
  ProfileChanges,
} from "./profileChangeRequest.model";
import {
  ALLOWED_FIELDS,
  SubmitProfileChangeDTO,
} from "./profileChangeRequest.validation";

/**
 * Roles permitted to approve / reject a player profile-change request.
 * Exported for use by routes/controllers in the approvals flow.
 */
export const LEADERSHIP_ROLES = ["Admin", "Manager", "SportingDirector"];

/**
 * Resolve the player UUID from a linked Player instance.
 * Mirrors the resilient pattern in portal.service.getPlayerId.
 */
function resolvePlayerId(player: Player): string {
  const id =
    player.getDataValue("id") ?? (player as unknown as { id?: string }).id;
  if (!id) throw new AppError("Player record has no ID", 500);
  return id;
}

/**
 * Submit a profile change. Builds the from→to diff over the whitelisted fields
 * only (the security boundary), then creates a profile_change_request row plus a
 * single-step approval ("player" / "update_profile"). One pending request per
 * player at a time.
 */
export async function submitProfileChange(
  userId: string,
  dto: SubmitProfileChangeDTO,
) {
  const player = await getLinkedPlayer(userId);
  const playerId = resolvePlayerId(player);

  // Build the diff over ALLOWED_FIELDS only — anything not whitelisted is ignored.
  const changes: ProfileChanges = {};
  const incoming = dto as Record<string, unknown>;
  for (const field of ALLOWED_FIELDS) {
    if (incoming[field] === undefined) continue;
    const next = incoming[field];
    const current = player.getDataValue(field) as unknown;
    if (current !== next) {
      changes[field] = { from: current ?? null, to: next };
    }
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError("No changes to submit", 422);
  }

  // App-level guard (no DB unique constraint). Acceptable for a single-user player action;
  // createApprovalRequest also dedups one Pending approval per (entityType, entityId).
  const existing = await ProfileChangeRequest.findOne({
    where: { playerId, status: "Pending" },
  });
  if (existing) {
    throw new AppError(
      "You already have a profile change awaiting approval",
      409,
    );
  }

  const firstName = (player.getDataValue("firstName") as string | null) ?? "";
  const lastName = (player.getDataValue("lastName") as string | null) ?? "";
  const playerName = `${firstName} ${lastName}`.trim();

  // Notification is routed to Admin (createApprovalRequest takes a single role).
  // Any leadership role in LEADERSHIP_ROLES may RESOLVE the approval (authorized at the route layer).
  const approval = await createApprovalRequest({
    entityType: "player",
    entityId: playerId,
    entityTitle: `Profile change - ${playerName || playerId}`,
    action: "update_profile",
    requestedBy: userId,
    assignedRole: "Admin",
    priority: "normal",
  });

  return ProfileChangeRequest.create({
    playerId,
    requestedBy: userId,
    changes,
    approvalRequestId: approval.id,
  });
}

/**
 * Apply an approved profile-change request: write the diff's to-values onto the
 * player and mark the request Approved. Idempotent — a no-op if there is no
 * matching Pending request (already applied or rejected).
 */
export async function applyProfileChangeRequest(
  approvalRequestId: string,
  resolvedBy: string,
) {
  const req = await ProfileChangeRequest.findOne({
    where: { approvalRequestId, status: "Pending" },
  });
  if (!req) return; // idempotent — already applied or rejected

  const player = await Player.findByPk(req.playerId);
  if (!player) throw new AppError("Player not found", 404);

  const updates: Record<string, unknown> = {};
  for (const [field, change] of Object.entries(req.changes)) {
    updates[field] = change.to;
  }

  await player.update(updates);
  await req.update({
    status: "Approved",
    resolvedBy,
    resolvedAt: new Date(),
  });

  // Bust portal + players caches so the new values surface immediately.
  // A cache miss/Redis outage must never break a successful apply.
  invalidateMultiple([CachePrefix.PORTAL, CachePrefix.PLAYERS]).catch((err) =>
    logger.warn("profile-change cache invalidation failed", {
      error: (err as Error).message,
    }),
  );

  return req;
}

/**
 * Reject a profile-change request: mark it Rejected and record the reviewer's
 * comment. The player is left untouched. Idempotent — a no-op if there is no
 * matching Pending request.
 */
export async function rejectProfileChangeRequest(
  approvalRequestId: string,
  resolvedBy: string,
  comment?: string,
) {
  const req = await ProfileChangeRequest.findOne({
    where: { approvalRequestId, status: "Pending" },
  });
  if (!req) return; // idempotent — already applied or rejected

  await req.update({
    status: "Rejected",
    resolvedBy,
    resolvedAt: new Date(),
    reviewerComment: comment ?? null,
  });

  return req;
}

/**
 * List the calling player's recent profile-change requests (newest first).
 */
export async function listMyProfileChanges(userId: string) {
  const player = await getLinkedPlayer(userId);
  const playerId = resolvePlayerId(player);

  return ProfileChangeRequest.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
    limit: 20,
  });
}
