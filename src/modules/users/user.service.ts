// ─────────────────────────────────────────────────────────────
// src/modules/users/user.service.ts
// Business logic for admin user management (CRUD).
//
// This is separate from auth.service.ts which handles
// login/register/profile for the authenticated user.
// This module lets Admins manage ALL users in the system.
// ─────────────────────────────────────────────────────────────
import { Op, Sequelize } from "sequelize";
import bcrypt from "bcryptjs";
import { User } from "@modules/users/user.model";
import { Player } from "@modules/players/player.model";
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import { CreateUserInput, UpdateUserInput } from "@modules/users/user.schema";

// ── Attributes to exclude from every response ──
const SAFE_ATTRIBUTES = {
  exclude: ["passwordHash"],
};

// ────────────────────────────────────────────────────────────
// List Users
// ────────────────────────────────────────────────────────────
export async function listUsers(queryParams: any) {
  const { limit, offset, page, sort, order, search } = parsePagination(
    queryParams,
    "createdAt",
  );

  const where: any = {};

  if (queryParams.role) where.role = queryParams.role;
  if (queryParams.isActive !== undefined) where.isActive = queryParams.isActive;

  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { fullName: { [Op.iLike]: pattern } },
      { fullNameAr: { [Op.iLike]: pattern } },
      { email: { [Op.iLike]: pattern } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: SAFE_ATTRIBUTES,
    limit,
    offset,
    order: [[sort, order]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ────────────────────────────────────────────────────────────
// Get User by ID
// ────────────────────────────────────────────────────────────
export async function getUserById(id: string) {
  const user = await User.findByPk(id, {
    attributes: SAFE_ATTRIBUTES,
  });

  if (!user) throw new AppError("User not found", 404);
  return user;
}

// ────────────────────────────────────────────────────────────
// Create User (Admin creates a team member)
// ────────────────────────────────────────────────────────────
export async function createUser(input: CreateUserInput, createdBy?: string) {
  // Check for duplicate email
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw new AppError("Email already registered", 409);

  // Hash the password
  const passwordHash = await bcrypt.hash(input.password, env.bcrypt.saltRounds);

  // If role is Player, auto-create a linked player record
  if (input.role === "Player" && createdBy) {
    return await sequelize.transaction(async (t) => {
      // Split fullName into firstName/lastName
      const nameParts = input.fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || firstName;

      let firstNameAr: string | undefined;
      let lastNameAr: string | undefined;
      if (input.fullNameAr) {
        const arParts = input.fullNameAr.trim().split(/\s+/);
        firstNameAr = arParts[0];
        lastNameAr = arParts.slice(1).join(" ") || firstNameAr;
      }

      const player = await Player.create(
        {
          firstName,
          lastName,
          firstNameAr,
          lastNameAr,
          email: input.email,
          createdBy,
        },
        { transaction: t },
      );

      const user = await User.create(
        {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          fullNameAr: input.fullNameAr,
          role: input.role as any,
          avatarUrl: input.avatarUrl,
          isActive: input.isActive,
          playerId: player.id,
        },
        { transaction: t },
      );

      const { passwordHash: _, ...safeUser } = user.get({ plain: true });
      return safeUser;
    });
  }

  const user = await User.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    fullNameAr: input.fullNameAr,
    role: input.role as any,
    avatarUrl: input.avatarUrl,
    isActive: input.isActive,
  });

  // Return without passwordHash
  const { passwordHash: _, ...safeUser } = user.get({ plain: true });
  return safeUser;
}

// ────────────────────────────────────────────────────────────
// Update User
// ────────────────────────────────────────────────────────────
export async function updateUser(id: string, input: UpdateUserInput) {
  const user = await findOrThrow(User, id, "User");

  // If email is being changed, check for duplicates
  if (input.email && input.email !== user.email) {
    const existing = await User.findOne({ where: { email: input.email } });
    if (existing) throw new AppError("Email already in use", 409);
  }

  await user.update(input);

  // Return without passwordHash
  const { passwordHash: _, ...safeUser } = user.get({ plain: true });
  return safeUser;
}

// ────────────────────────────────────────────────────────────
// Reset Password (Admin force-resets another user's password)
// ────────────────────────────────────────────────────────────
export async function resetPassword(id: string, newPassword: string) {
  const user = await findOrThrow(User, id, "User");

  const passwordHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await user.update({ passwordHash });

  return { message: "Password reset successfully" };
}

// ────────────────────────────────────────────────────────────
// Delete User (soft or hard — currently hard delete)
// ────────────────────────────────────────────────────────────
export async function deleteUser(id: string, requesterId: string) {
  // Prevent self-deletion
  if (id === requesterId) {
    throw new AppError("Cannot delete your own account", 400);
  }

  const user = await findOrThrow(User, id, "User");

  await user.destroy();
  return { id };
}
