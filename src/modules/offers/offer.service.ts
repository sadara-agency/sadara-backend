import { Op, Sequelize } from "sequelize";
import { Offer } from "@modules/offers/offer.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { Contract } from "@modules/contracts/contract.model";
import { notifyByRole } from "@modules/notifications/notification.service";
import {
  createApprovalRequest,
  resolveApprovalByEntity,
} from "@modules/approvals/approval.service";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { logger } from "@config/logger";
import {
  generateOfferCreationTask,
  generateOfferAcceptedTask,
} from "@modules/offers/offerAutoTasks";

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

  // Fire-and-forget: auto-create review task for Manager
  generateOfferCreationTask(offer.id, createdBy).catch((err) =>
    logger.warn("Offer auto-task generation failed", {
      offerId: offer.id,
      error: (err as Error).message,
    }),
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

  // Fire-and-forget: auto-create conversion task when accepted
  if (input.status === "Accepted") {
    generateOfferAcceptedTask(id, "system").catch((err) =>
      logger.warn("Offer accepted auto-task failed", {
        offerId: id,
        error: (err as Error).message,
      }),
    );
  }

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
// Uses atomic WHERE clause instead of a transaction to avoid the
// PostgreSQL "current transaction is aborted" cascade problem.
export async function convertOfferToContract(
  offerId: string,
  createdBy: string,
) {
  // ── Step 1: Validate the offer ──
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

  // Validate that the referenced club actually exists in the DB
  const clubExists = await Club.findByPk(clubId, { attributes: ["id"] });
  if (!clubExists) {
    throw new AppError(
      `Cannot convert: the resolved club (${clubId}) no longer exists`,
      400,
    );
  }

  // Build contract dates
  const today = new Date();
  const endDate = new Date(today);
  endDate.setFullYear(endDate.getFullYear() + (offer.contractYears || 1));

  // Map offer type → contract type
  const contractType = offer.offerType === "Loan" ? "Loan" : "Transfer";

  const startDateStr = today.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // ── Step 2: Create the contract (outside any transaction) ──
  let contract;
  try {
    contract = await Contract.create({
      playerId: offer.playerId,
      clubId,
      category: "Club",
      contractType,
      status: "Draft",
      startDate: startDateStr,
      endDate: endDateStr,
      baseSalary:
        offer.salaryOffered != null ? String(offer.salaryOffered) : "0",
      salaryCurrency: offer.feeCurrency || "SAR",
      signingBonus: offer.transferFee ?? 0,
      commissionPct: offer.agentFee != null ? String(offer.agentFee) : "10",
      notes: `Auto-created from offer #${offerId}. Requires review and signing before activation.`,
      createdBy,
    } as any);
  } catch (err) {
    logger.error("Contract.create failed during offer conversion", {
      offerId,
      clubId,
      contractType,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    throw new AppError(
      `Failed to create contract: ${(err as Error).message}`,
      500,
    );
  }

  // ── Step 3: Atomically mark offer as converted ──
  // WHERE convertedContractId IS NULL prevents double-conversion races.
  try {
    const [affectedRows] = await Offer.update(
      {
        status: "Converted",
        convertedContractId: contract.id,
        convertedAt: new Date(),
      },
      {
        where: {
          id: offerId,
          convertedContractId: null, // atomic guard
        },
      },
    );

    if (affectedRows === 0) {
      // Another request already converted this offer — clean up our contract
      await contract.destroy().catch(() => {});
      throw new AppError(
        "This offer has already been converted to a contract",
        400,
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Offer update failed — clean up the contract we just created
    await contract.destroy().catch(() => {});
    logger.error("Offer.update failed during conversion", {
      offerId,
      contractId: contract.id,
      error: (err as Error).message,
    });
    throw new AppError(
      `Failed to update offer: ${(err as Error).message}`,
      500,
    );
  }

  // Reload the offer to get updated state
  await offer.reload();

  // ── Step 4: Notify (fire-and-forget) ──
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
  }).catch((notifErr) =>
    logger.warn("Offer conversion notification failed", {
      error: (notifErr as Error).message,
    }),
  );

  return { offer, contract };
}
