import { Op } from "sequelize";
import { Document, DocumentEntityType } from "./document.model";
import { Player } from "../players/player.model";
import { Contract } from "../contracts/contract.model";
import { Match } from "../matches/match.model";
import { Injury } from "../injuries/injury.model";
import { Club } from "../clubs/club.model";
import { Offer } from "../offers/offer.model";
import { User } from "../Users/user.model";
import { AppError } from "../../middleware/errorHandler";
import { parsePagination, buildMeta } from "../../shared/utils/pagination";
import { findOrThrow, destroyById } from "../../shared/utils/serviceHelpers";
import { hasPermission } from "../permissions/permission.service";

const USER_ATTRS = ["id", "fullName"] as const;

function docIncludes() {
  return [{ model: User, as: "uploader", attributes: [...USER_ATTRS] }];
}

/** Re-fetch with full includes. */
async function refetchWithIncludes(id: string) {
  return Document.findByPk(id, { include: docIncludes() });
}

// ── Entity label resolution ──

type EntityModel =
  | typeof Player
  | typeof Contract
  | typeof Match
  | typeof Injury
  | typeof Club
  | typeof Offer;

const ENTITY_MODELS: Record<DocumentEntityType, EntityModel> = {
  Player: Player,
  Contract: Contract,
  Match: Match,
  Injury: Injury,
  Club: Club,
  Offer: Offer,
};

/** Resolve a human-readable label for the given entity. */
export async function resolveEntityLabel(
  entityType: DocumentEntityType,
  entityId: string,
): Promise<string | null> {
  switch (entityType) {
    case "Player": {
      const p = await Player.findByPk(entityId, {
        attributes: ["firstName", "lastName"],
      });
      return p
        ? `${p.getDataValue("firstName")} ${p.getDataValue("lastName")}`
        : null;
    }
    case "Contract": {
      const c = await Contract.findByPk(entityId, {
        attributes: ["id", "contractType"],
      });
      return c
        ? `${c.getDataValue("contractType")} #${entityId.slice(0, 8)}`
        : null;
    }
    case "Match": {
      const m = await Match.findByPk(entityId, {
        attributes: ["id", "matchDate"],
      });
      return m
        ? `Match ${m.getDataValue("matchDate") || `#${entityId.slice(0, 8)}`}`
        : null;
    }
    case "Injury": {
      const inj = await Injury.findByPk(entityId, {
        attributes: ["injuryType", "bodyPart"],
      });
      return inj
        ? `${inj.getDataValue("injuryType")} - ${inj.getDataValue("bodyPart")}`
        : null;
    }
    case "Club": {
      const cl = await Club.findByPk(entityId, { attributes: ["name"] });
      return cl ? cl.getDataValue("name") : null;
    }
    case "Offer": {
      const o = await Offer.findByPk(entityId, {
        attributes: ["id", "offerType"],
      });
      return o
        ? `${o.getDataValue("offerType")} Offer #${entityId.slice(0, 8)}`
        : null;
    }
    default:
      return null;
  }
}

/** Validate that the entity exists. Throws 404 if not found. */
async function validateEntity(
  entityType: DocumentEntityType,
  entityId: string,
) {
  const Model = ENTITY_MODELS[entityType];
  const exists = await (Model as any).findByPk(entityId, {
    attributes: ["id"],
  });
  if (!exists) throw new AppError(`${entityType} not found`, 404);
}

// ── Entity type → permission module mapping ──

const ENTITY_TYPE_TO_MODULE: Record<string, string> = {
  Player: "players",
  Contract: "contracts",
  Match: "matches",
  Injury: "injuries",
  Club: "clubs",
  Offer: "offers",
};

/**
 * Document types that contain sensitive personal/medical data.
 * These are hidden from roles that should not see them.
 */
const SENSITIVE_DOC_TYPES_BY_ROLE: Record<string, string[]> = {
  Scout: ["Passport", "Medical", "ID"],
  Player: ["Passport", "ID"],
  Media: ["Passport", "Medical", "ID"],
  GymCoach: ["Passport", "ID", "Contract"],
  Coach: ["Passport", "ID", "Contract"],
};

// ── List ──

export async function listDocuments(queryParams: any, userRole?: string) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );
  const where: any = {};

  if (queryParams.type) where.type = queryParams.type;
  if (queryParams.status) where.status = queryParams.status;
  if (queryParams.entityType) where.entityType = queryParams.entityType;
  if (queryParams.entityId) where.entityId = queryParams.entityId;

  // RBAC: Filter out sensitive document types for restricted roles
  if (userRole && userRole !== "Admin") {
    const blockedTypes = SENSITIVE_DOC_TYPES_BY_ROLE[userRole];
    if (blockedTypes && blockedTypes.length > 0) {
      where.type = where.type
        ? { [Op.and]: [{ [Op.eq]: where.type }, { [Op.notIn]: blockedTypes }] }
        : { [Op.notIn]: blockedTypes };
    }

    // Exclude documents linked to entities the role cannot read
    const excludedEntityTypes: string[] = [];
    for (const [entityType, mod] of Object.entries(ENTITY_TYPE_TO_MODULE)) {
      const canRead = await hasPermission(userRole, mod, "read");
      if (!canRead) excludedEntityTypes.push(entityType);
    }
    if (excludedEntityTypes.length > 0) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [
            { entityType: { [Op.notIn]: excludedEntityTypes } },
            { entityType: null },
          ],
        },
      ];
    }
  }

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } },
      { entityLabel: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Document.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: docIncludes(),
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getDocumentById(id: string) {
  const doc = await Document.findByPk(id, { include: docIncludes() });
  if (!doc) throw new AppError("Document not found", 404);
  return doc;
}

// ── Create (with real file data) ──

export async function createDocument(input: any, userId: string) {
  // Validate linked entity if provided
  if (input.entityType && input.entityId) {
    await validateEntity(input.entityType, input.entityId);
    // Resolve and denormalize the entity label
    if (!input.entityLabel) {
      input.entityLabel = await resolveEntityLabel(
        input.entityType,
        input.entityId,
      );
    }
  }

  const doc = await Document.create({ ...input, uploadedBy: userId });
  return refetchWithIncludes(doc.id);
}

// ── Update ──

export async function updateDocument(id: string, input: any) {
  const doc = await findOrThrow(Document, id, "Document");

  // If entity link is being changed, validate and resolve label
  if (input.entityType && input.entityId) {
    await validateEntity(input.entityType, input.entityId);
    if (!input.entityLabel) {
      input.entityLabel = await resolveEntityLabel(
        input.entityType,
        input.entityId,
      );
    }
  }

  await doc.update(input);
  return refetchWithIncludes(id);
}

// ── Delete ──

export async function deleteDocument(id: string) {
  return destroyById(Document, id, "Document");
}
