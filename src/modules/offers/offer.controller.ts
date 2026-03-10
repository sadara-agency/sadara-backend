import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { logger } from "../../config/logger";
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from "../../shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "../../shared/utils/audit";
import * as offerService from "./offer.service";
import {
  createApprovalRequest,
  resolveApprovalByEntity,
} from "../approvals/approval.service";
import { Player } from "../players/player.model";

// ── List Offers ──

export async function list(req: AuthRequest, res: Response) {
  const result = await offerService.listOffers(req.query);
  sendPaginated(res, result.data, result.meta);
}

// ── Get Offer by ID ──

export async function getById(req: AuthRequest, res: Response) {
  const offer = await offerService.getOfferById(req.params.id);
  sendSuccess(res, offer);
}

// ── Get Offers by Player ──

export async function getByPlayer(req: AuthRequest, res: Response) {
  const offers = await offerService.getOffersByPlayer(req.params.playerId);
  sendSuccess(res, offers);
}

// ── Create Offer ──

export async function create(req: AuthRequest, res: Response) {
  const offer = await offerService.createOffer(req.body, req.user!.id);

  await logAudit(
    "CREATE",
    "offers",
    offer.id,
    buildAuditContext(req.user!, req.ip),
    `Created ${offer.offerType} offer for player ${offer.playerId}`,
  );

  sendCreated(res, offer);
}

// ── Update Offer ──

export async function update(req: AuthRequest, res: Response) {
  const offer = await offerService.updateOffer(req.params.id, req.body);

  await logAudit(
    "UPDATE",
    "offers",
    offer.id,
    buildAuditContext(req.user!, req.ip),
    `Updated offer ${offer.id}`,
  );

  sendSuccess(res, offer, "Offer updated");
}

// ── Update Offer Status ──

export async function updateStatus(req: AuthRequest, res: Response) {
  const offer = await offerService.updateOfferStatus(req.params.id, req.body);

  await logAudit(
    "UPDATE",
    "offers",
    offer.id,
    buildAuditContext(req.user!, req.ip),
    `Offer status changed to ${offer.status}`,
  );

  // Approval hooks
  if (req.body.status === "Under Review") {
    const player = await Player.findByPk(offer.playerId, {
      attributes: ["firstName", "lastName"],
    });
    const playerName = player
      ? [player.firstName, player.lastName].filter(Boolean).join(" ")
      : `#${offer.id.slice(0, 8)}`;
    createApprovalRequest({
      entityType: "offer",
      entityId: offer.id,
      entityTitle: `${offer.offerType} Offer: ${playerName}`,
      action: "review_offer",
      requestedBy: req.user!.id,
      assignedRole: "Manager",
      priority: "normal",
    }).catch((err) =>
      logger.warn("Offer approval request failed", {
        error: (err as Error).message,
      }),
    );
  } else if (["Negotiation", "Closed", "Converted"].includes(req.body.status)) {
    resolveApprovalByEntity("offer", offer.id, req.user!.id, "Approved").catch(
      (err) =>
        logger.warn("Offer approval resolution failed", {
          error: (err as Error).message,
        }),
    );
  }

  sendSuccess(res, offer, `Offer status updated to ${offer.status}`);
}

// ── Delete Offer ──

export async function remove(req: AuthRequest, res: Response) {
  const result = await offerService.deleteOffer(req.params.id);

  await logAudit(
    "DELETE",
    "offers",
    result.id,
    buildAuditContext(req.user!, req.ip),
    "Offer deleted",
  );

  sendSuccess(res, result, "Offer deleted");
}

export async function convertToContract(req: AuthRequest, res: Response) {
  const result = await offerService.convertOfferToContract(
    req.params.id,
    req.user!.id,
  );
  await logAudit(
    "CREATE",
    "contracts",
    result.contract.id,
    buildAuditContext(req.user!, req.ip),
    `Converted offer ${req.params.id} to contract ${result.contract.id}`,
  );
  sendCreated(res, result, "Offer converted to contract");
}
