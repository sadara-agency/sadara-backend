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

const COACH_ROLES = [
  "Coach",
  "SkillCoach",
  "TacticalCoach",
  "FitnessCoach",
  "NutritionSpecialist",
  "GymCoach",
  "GoalkeeperCoach",
  "MentalCoach",
];

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
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
          "role",
          "email",
        ],
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
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
          "role",
          "email",
        ],
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
  if (!coach) throw new AppError("Coach user not found", 404);
  if (!COACH_ROLES.includes(coach.role)) {
    throw new AppError(
      `User role '${coach.role}' is not a coach role — cannot assign to a player`,
      422,
    );
  }

  try {
    return await PlayerCoachAssignment.create(data);
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw new AppError(
        "This coach is already assigned to this player with that specialty",
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
