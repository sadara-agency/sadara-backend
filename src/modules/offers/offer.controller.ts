import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendCreated } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { logger } from "@config/logger";
import { createCrudController } from "@shared/utils/crudController";
import * as offerService from "@modules/offers/offer.service";
import {
  createApprovalRequest,
  resolveApprovalByEntity,
} from "@modules/approvals/approval.service";
import { Player } from "@modules/players/player.model";

const crud = createCrudController({
  service: {
    list: (query) => offerService.listOffers(query),
    getById: (id) => offerService.getOfferById(id),
    create: (body, userId) => offerService.createOffer(body, userId),
    update: (id, body) => offerService.updateOffer(id, body),
    delete: (id) => offerService.deleteOffer(id),
  },
  entity: "offers",
  cachePrefixes: [],
  label: (o) => `${o.offerType} offer for player ${o.playerId}`,
});

export const { list, getById, create, update, remove } = crud;

// ── Custom handlers ──

export async function getByPlayer(req: AuthRequest, res: Response) {
  const offers = await offerService.getOffersByPlayer(req.params.playerId);
  sendSuccess(res, offers);
}

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
      attributes: ["firstName", "lastName", "firstNameAr", "lastNameAr"],
    });
    const playerName = player
      ? [player.firstName, player.lastName].filter(Boolean).join(" ")
      : `#${offer.id.slice(0, 8)}`;
    const playerNameAr = player
      ? [player.firstNameAr, player.lastNameAr].filter(Boolean).join(" ")
      : "";
    const offerTypeAr = offer.offerType === "Transfer" ? "انتقال" : "إعارة";
    createApprovalRequest({
      entityType: "offer",
      entityId: offer.id,
      entityTitle: `${offer.offerType} Offer: ${playerName}`,
      entityTitleAr: `عرض ${offerTypeAr}: ${playerNameAr || playerName}`,
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
