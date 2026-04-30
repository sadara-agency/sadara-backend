import Design from "./design.model";
import { Player } from "@modules/players/player.model";
import { Match } from "@modules/matches/match.model";
import { Club } from "@modules/clubs/club.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import type { AuthUser } from "@shared/types";
import type {
  CreateDesignInput,
  UpdateDesignInput,
  DesignQuery,
} from "./design.validation";

const PLAYER_ATTRS = [
  "id",
  "firstName",
  "lastName",
  "firstNameAr",
  "lastNameAr",
];
const MATCH_ATTRS = ["id", "homeTeamName", "awayTeamName", "matchDate"];
const CLUB_ATTRS = ["id", "name", "nameAr", "logoUrl"];
const CREATOR_ATTRS = ["id", "fullName", "fullNameAr"];

const includeAll = [
  { model: Player, as: "player", attributes: PLAYER_ATTRS, required: false },
  { model: Match, as: "match", attributes: MATCH_ATTRS, required: false },
  { model: Club, as: "club", attributes: CLUB_ATTRS, required: false },
  { model: User, as: "creator", attributes: CREATOR_ATTRS, required: false },
];

const ALLOWED_SORTS = ["created_at", "updated_at", "title", "status", "type"];

export async function listDesigns(query: DesignQuery, _user?: AuthUser) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "created_at",
    ALLOWED_SORTS,
  );

  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  if (query.playerId) where.playerId = query.playerId;
  if (query.matchId) where.matchId = query.matchId;
  if (query.clubId) where.clubId = query.clubId;
  if (query.createdBy) where.createdBy = query.createdBy;

  const { count, rows } = await Design.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order]],
    include: includeAll,
    distinct: true,
    subQuery: false,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getDesignById(id: string, _user?: AuthUser) {
  const item = await Design.findByPk(id, { include: includeAll });
  if (!item) throw new AppError("Design not found", 404);
  return item;
}

export async function createDesign(data: CreateDesignInput, createdBy: string) {
  if (data.playerId) {
    const player = await Player.findByPk(data.playerId);
    if (!player) throw new AppError("Player not found", 404);
  }
  if (data.matchId) {
    const match = await Match.findByPk(data.matchId);
    if (!match) throw new AppError("Match not found", 404);
  }
  if (data.clubId) {
    const club = await Club.findByPk(data.clubId);
    if (!club) throw new AppError("Club not found", 404);
  }

  return Design.create({ ...data, createdBy });
}

export async function updateDesign(id: string, data: UpdateDesignInput) {
  const item = await getDesignById(id);
  return item.update(data);
}

export async function deleteDesign(id: string) {
  const item = await getDesignById(id);
  await item.destroy();
  return { id };
}

export async function publishDesign(id: string) {
  const item = await getDesignById(id);
  if (!item.assetUrl) {
    throw new AppError(
      "Cannot publish a design without an uploaded asset",
      422,
    );
  }
  return item.update({ status: "published", publishedAt: new Date() });
}
