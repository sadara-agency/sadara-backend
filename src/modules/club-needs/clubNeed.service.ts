import { UniqueConstraintError } from "sequelize";
import ClubNeed from "./clubNeed.model";
import { Club } from "@modules/clubs/club.model";
import TransferWindow from "@modules/transfer-windows/transferWindow.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import type { AuthUser } from "@shared/types";
import type {
  CreateClubNeedInput,
  UpdateClubNeedInput,
  ClubNeedQuery,
} from "./clubNeed.validation";

export async function listClubNeeds(query: ClubNeedQuery, _user?: AuthUser) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "priority",
  );

  const where: Record<string, unknown> = {};
  if (query.windowId) where.windowId = query.windowId;
  if (query.clubId) where.clubId = query.clubId;
  if (query.priority) where.priority = query.priority;

  const { count, rows } = await ClubNeed.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order.toUpperCase()]],
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl", "league"],
      },
      {
        model: TransferWindow,
        as: "window",
        attributes: ["id", "season", "status"],
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getClubNeedById(id: string, _user?: AuthUser) {
  const item = await ClubNeed.findByPk(id, {
    include: [
      {
        model: Club,
        as: "club",
        attributes: ["id", "name", "nameAr", "logoUrl", "league"],
      },
      {
        model: TransferWindow,
        as: "window",
        attributes: ["id", "season", "status"],
      },
    ],
  });
  if (!item) throw new AppError("Club need not found", 404);
  return item;
}

export async function createClubNeed(
  data: CreateClubNeedInput,
  _createdBy: string,
) {
  const [club, window] = await Promise.all([
    Club.findByPk(data.clubId),
    TransferWindow.findByPk(data.windowId),
  ]);
  if (!club) throw new AppError("Club not found", 404);
  if (!window) throw new AppError("Transfer window not found", 404);

  try {
    return await ClubNeed.create(data);
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new AppError(
        "This position is already tracked for this club in this window",
        409,
      );
    }
    throw err;
  }
}

export async function updateClubNeed(id: string, data: UpdateClubNeedInput) {
  const item = await getClubNeedById(id);
  return item.update(data);
}

export async function deleteClubNeed(id: string) {
  const item = await getClubNeedById(id);
  await item.destroy();
  return { id };
}
