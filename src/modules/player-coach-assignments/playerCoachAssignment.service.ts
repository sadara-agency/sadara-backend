import { UniqueConstraintError } from "sequelize";
import PlayerCoachAssignment from "./playerCoachAssignment.model";
import { Player } from "@modules/players/player.model";
import { User } from "@modules/users/user.model";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import type { AuthUser } from "@shared/types";
import type {
  CreateAssignmentInput,
  AssignmentQuery,
} from "./playerCoachAssignment.validation";

export async function listAssignments(
  query: AssignmentQuery,
  _user?: AuthUser,
) {
  const { limit, offset, page, sort, order } = parsePagination(
    query,
    "created_at",
  );

  const where: Record<string, unknown> = {};
  if (query.playerId) where.playerId = query.playerId;
  if (query.coachUserId) where.coachUserId = query.coachUserId;
  if (query.specialty) where.specialty = query.specialty;

  const { count, rows } = await PlayerCoachAssignment.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sort, order.toUpperCase()]],
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
      },
      {
        model: User,
        as: "coachUser",
        attributes: ["id", "fullName", "fullNameAr", "role", "email"],
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

export async function getAssignmentById(id: string, _user?: AuthUser) {
  const item = await PlayerCoachAssignment.findByPk(id, {
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
      },
      {
        model: User,
        as: "coachUser",
        attributes: ["id", "fullName", "fullNameAr", "role", "email"],
      },
    ],
  });
  if (!item) throw new AppError("Assignment not found", 404);
  return item;
}

export async function createAssignment(
  data: CreateAssignmentInput,
  _createdBy: string,
) {
  const [player, coach] = await Promise.all([
    Player.findByPk(data.playerId),
    User.findByPk(data.coachUserId),
  ]);
  if (!player) throw new AppError("Player not found", 404);
  if (!coach) throw new AppError("Staff user not found", 404);
  if (coach.role === "Player") {
    throw new AppError("Players cannot be added to a working group", 422);
  }

  try {
    return await PlayerCoachAssignment.create(data);
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new AppError(
        "This person is already in this player's working group",
        409,
      );
    }
    throw err;
  }
}

export async function deleteAssignment(id: string) {
  const item = await getAssignmentById(id);
  await item.destroy();
  return { id };
}
