import { Op, Sequelize } from "sequelize";
import { Offer } from "./offer.model";
import { Player } from "../players/player.model";
import { Club } from "../clubs/club.model";
import { User } from "../Users/user.model";
import { AppError } from "../../middleware/errorHandler";
import { parsePagination, buildMeta } from "../../shared/utils/pagination";
import { Contract } from "../contracts/contract.model";
import { transaction } from "../../config/database";
import { notifyByRole } from "../notifications/notification.service";
import {
  createApprovalRequest,
  resolveApprovalByEntity,
} from "../approvals/approval.service";
import { findOrThrow } from "../../shared/utils/serviceHelpers";
import { logger } from "../../config/logger";

// ── List Offers ──

export async function listOffers(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where: any = {};

  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.offerType) where.offerType = queryParams.offerType;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.fromClubId) where.fromClubId = queryParams.fromClubId;
  if (queryParams.toClubId) where.toClubId = queryParams.toClubId;

  if (search) {
    // Search across related player name and club names via subqueries
    where[Op.or] = [
      { "$player.first_name$": { [Op.iLike]: `%${search}%` } },
      { "$player.last_name$": { [Op.iLike]: `%${search}%` } },
      { "$fromClub.name$": { [Op.iLike]: `%${search}%` } },
      { "$toClub.name$": { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Offer.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: [
      {
        model: Player,
        as: "player",
        attributes: ["id", "firstName", "lastName", "photoUrl", "position"],
      },
      {
        model: Club,
        as: "fromClub",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
      {
        model: Club,
        as: "toClub",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
      { model: User, as: "creator", attributes: ["id", "fullName"] },
    ],
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get Offer by ID ──

export async function getOfferById(id: string) {
  const offer = await Offer.findByPk(id, {
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "photoUrl",
          "position",
          "currentClubId",
        ],
      },
      {
        model: Club,
        as: "fromClub",
        attributes: ["id", "name", "nameAr", "logoUrl", "league"],
      },
      {
        model: Club,
        as: "toClub",
        attributes: ["id", "name", "nameAr", "logoUrl", "league"],
      },
      { model: User, as: "creator", attributes: ["id", "fullName"] },
    ],
  });

  if (!offer) throw new AppError("Offer not found", 404);

  return offer;
}

// ── Get Offers by Player ──

export async function getOffersByPlayer(playerId: string) {
  const offers = await Offer.findAll({
    where: { playerId },
    order: [["createdAt", "DESC"]],
    include: [
      { model: Club, as: "fromClub", attributes: ["id", "name", "logoUrl"] },
      { model: Club, as: "toClub", attributes: ["id", "name", "logoUrl"] },
    ],
  });

  return offers;
}

// ── Create Offer ──

export async function createOffer(input: any, createdBy: string) {
  // Verify player and clubs exist (parallel lookups)
  const [player] = await Promise.all([
    findOrThrow(Player, input.playerId, "Player"),
    input.fromClubId ? findOrThrow(Club, input.fromClubId, "From-club") : null,
    input.toClubId ? findOrThrow(Club, input.toClubId, "To-club") : null,
  ]);

  const offer = await Offer.create({ ...input, createdBy });

  // Notify Admin/Manager about new offer
  const playerName =
    [player.firstName, player.lastName].filter(Boolean).join(" ") || "Unknown";
  const playerNameAr = player.firstNameAr
    ? [player.firstNameAr, player.lastNameAr].filter(Boolean).join(" ")
    : playerName;
  notifyByRole(["Admin", "Manager"], {
    type: "contract",
    title: `New offer: ${playerName}`,
    titleAr: `عرض جديد: ${playerNameAr}`,
    link: `/dashboard/offers/${offer.id}`,
    sourceType: "offer",
    sourceId: offer.id,
    priority: "normal",
  }).catch((err) =>
    logger.warn("Offer notification failed", { error: (err as Error).message }),
  );

  return offer;
}

// ── Update Offer ──

export async function updateOffer(id: string, input: any) {
  const offer = await findOrThrow(Offer, id, "Offer");

  // Prevent updates on terminal offers
  if (["Accepted", "Rejected", "Closed", "Converted"].includes(offer.status)) {
    throw new AppError("Cannot update a closed/accepted/rejected offer", 400);
  }

  return await offer.update(input);
}

// ── Update Offer Status ──

export async function updateOfferStatus(
  id: string,
  input: { status: string; counterOffer?: object; notes?: string },
) {
  const offer = await findOrThrow(Offer, id, "Offer");

  const updateData: any = { status: input.status };

  if (input.counterOffer) updateData.counterOffer = input.counterOffer;
  if (input.notes) updateData.notes = input.notes;

  // Set timestamps based on status transitions
  if (input.status === "Under Review" || input.status === "Negotiation") {
    updateData.respondedAt = new Date();
  }
  if (
    input.status === "Accepted" ||
    input.status === "Rejected" ||
    input.status === "Closed"
  ) {
    updateData.closedAt = new Date();
  }

  await offer.update(updateData);

  // Notify Admin/Manager about status change
  const statusAr: Record<string, string> = {
    Pending: "معلق",
    Negotiating: "قيد التفاوض",
    Accepted: "مقبول",
    Rejected: "مرفوض",
    Closed: "مغلق",
    Converted: "محوّل",
  };
  notifyByRole(["Admin", "Manager"], {
    type: "contract",
    title: `Offer status → ${input.status}`,
    titleAr: `حالة العرض → ${statusAr[input.status] || input.status}`,
    link: `/dashboard/offers/${id}`,
    sourceType: "offer",
    sourceId: id,
    priority: "high",
  }).catch((err) =>
    logger.warn("Offer notification failed", { error: (err as Error).message }),
  );

  return offer;
}

// ── Delete Offer ──

export async function deleteOffer(id: string) {
  const offer = await findOrThrow(Offer, id, "Offer");

  // Only allow deleting New or Draft offers
  if (offer.status !== "New") {
    throw new AppError("Only new offers can be deleted", 400);
  }

  await offer.destroy();
  return { id };
}

// ── Convert Offer to Contract ──
export async function convertOfferToContract(
  offerId: string,
  createdBy: string,
) {
  // Pre-validate outside the transaction to avoid aborted-transaction cascading errors
  const offer = await Offer.findByPk(offerId, {
    include: [
      {
        model: Player,
        as: "player",
        attributes: ["id", "firstName", "lastName", "currentClubId"],
      },
      { model: Club, as: "fromClub", attributes: ["id", "name"] },
      { model: Club, as: "toClub", attributes: ["id", "name"] },
    ],
  });

  if (!offer) throw new AppError("Offer not found", 404);
  if (offer.status !== "Accepted" && offer.status !== "Closed") {
    throw new AppError(
      "Only accepted/closed offers can be converted to contracts",
      400,
    );
  }
  if (offer.convertedContractId) {
    throw new AppError(
      "This offer has already been converted to a contract",
      400,
    );
  }

  const clubId =
    offer.toClubId || offer.fromClubId || (offer as any).player?.currentClubId;
  if (!clubId) {
    throw new AppError(
      "Cannot convert: no club assigned to this offer (set From Club or To Club first)",
      400,
    );
  }

  // Build contract dates
  const today = new Date();
  const endDate = new Date(today);
  endDate.setFullYear(endDate.getFullYear() + (offer.contractYears || 1));

  // Map offer type → contract type
  const contractType = offer.offerType === "Loan" ? "Loan" : "Transfer";

  return transaction(async (t) => {
    // Re-check inside transaction with lock
    const locked = await Offer.findByPk(offerId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!locked) throw new AppError("Offer not found", 404);
    if (locked.convertedContractId) {
      throw new AppError("This offer has already been converted", 400);
    }

    const contract = await Contract.create(
      {
        playerId: offer.playerId,
        clubId,
        contractType,
        status: "Draft",
        startDate: today.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        baseSalary:
          offer.salaryOffered != null ? String(offer.salaryOffered) : "0",
        salaryCurrency: offer.feeCurrency || "SAR",
        signingBonus: offer.transferFee || 0,
        commissionPct: offer.agentFee != null ? String(offer.agentFee) : "10",
        notes: `Auto-created from offer #${offerId}. Requires review and signing before activation.`,
        createdBy,
      } as any,
      { transaction: t },
    );

    // Link offer to contract and mark as Converted
    await locked.update(
      {
        status: "Converted",
        convertedContractId: contract.id,
        convertedAt: new Date(),
      },
      { transaction: t },
    );

    // Notify Admin/Manager about conversion
    const playerName = (offer as any).player
      ? `${(offer as any).player.firstName} ${(offer as any).player.lastName || ""}`.trim()
      : "Unknown";
    notifyByRole(["Admin", "Manager"], {
      type: "contract",
      title: `Offer converted to contract: ${playerName}`,
      titleAr: `تم تحويل العرض إلى عقد: ${playerName}`,
      link: `/dashboard/contracts/${contract.id}`,
      sourceType: "contract",
      sourceId: contract.id,
      priority: "high",
    }).catch((err) =>
      logger.warn("Offer notification failed", {
        error: (err as Error).message,
      }),
    );

    return { offer: locked, contract };
  });
}
