import { MediaKitGeneration } from "./mediaKit.model";
import { Player } from "@modules/players/player.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { logger } from "@config/logger";

// ── Includes ──

const INCLUDES = [
  {
    model: Player,
    as: "player",
    attributes: ["id", "firstName", "lastName", "photoUrl", "position"],
    required: false,
  },
  {
    model: Club,
    as: "club",
    attributes: ["id", "name", "nameAr", "logoUrl"],
    required: false,
  },
  {
    model: User,
    as: "generator",
    attributes: ["id", "fullName"],
    required: false,
  },
];

// ── Generate Player Profile Kit ──

export async function generatePlayerKit(
  playerId: string,
  language: "en" | "ar" | "both",
  userId: string,
) {
  // Verify player exists
  const player = await Player.findByPk(playerId, {
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl"],
      },
    ],
  });
  if (!player) throw new AppError("Player not found", 404);

  // TODO: Phase 3 enhancement — integrate with shared/utils/pdf.ts
  // For now, log the generation and create a record without actual PDF
  logger.info("Media kit generation requested", {
    templateType: "player_profile",
    playerId,
    language,
    userId,
  });

  const generation = await MediaKitGeneration.create({
    templateType: "player_profile",
    language,
    playerId,
    generatedBy: userId,
    // fileUrl and fileSize will be populated when PDF generation is integrated
  });

  return generation;
}

// ── Generate Squad Roster Kit ──

export async function generateSquadKit(
  clubId: string,
  language: "en" | "ar" | "both",
  userId: string,
) {
  const club = await Club.findByPk(clubId);
  if (!club) throw new AppError("Club not found", 404);

  logger.info("Media kit generation requested", {
    templateType: "squad_roster",
    clubId,
    language,
    userId,
  });

  const generation = await MediaKitGeneration.create({
    templateType: "squad_roster",
    language,
    clubId,
    generatedBy: userId,
  });

  return generation;
}

// ── List Generation History ──

export async function listGenerationHistory(
  queryParams: Record<string, unknown>,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    queryParams,
    "created_at",
  );

  const where: Record<string, unknown> = {};

  if (queryParams.templateType) where.templateType = queryParams.templateType;
  if (queryParams.playerId) where.playerId = queryParams.playerId;
  if (queryParams.clubId) where.clubId = queryParams.clubId;

  const { count, rows } = await MediaKitGeneration.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Get by ID ──

export async function getGenerationById(id: string) {
  const generation = await MediaKitGeneration.findByPk(id, {
    include: INCLUDES,
  });
  if (!generation) throw new AppError("Media kit generation not found", 404);
  return generation;
}
