// ─────────────────────────────────────────────────────────────
// src/modules/users/user.service.ts
// Business logic for admin user management (CRUD).
//
// This is separate from auth.service.ts which handles
// login/register/profile for the authenticated user.
// This module lets Admins manage ALL users in the system.
// ─────────────────────────────────────────────────────────────
import { Op, Sequelize, QueryTypes } from "sequelize";
import bcrypt from "bcryptjs";
import { User } from "@modules/users/user.model";
import { Player } from "@modules/players/player.model";
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { AppError } from "@middleware/errorHandler";
import { parsePagination, buildMeta } from "@shared/utils/pagination";
import { findOrThrow } from "@shared/utils/serviceHelpers";
import {
  CreateUserInput,
  UpdateUserInput,
} from "@modules/users/user.validation";

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
// User Stats (for directory KPIs)
// ────────────────────────────────────────────────────────────
export async function getUserStats() {
  const [total, active, byRole] = await Promise.all([
    User.count(),
    User.count({ where: { isActive: true } }),
    User.findAll({
      attributes: [
        "role",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      group: ["role"],
      raw: true,
    }) as unknown as Promise<Array<{ role: string; count: string }>>,
  ]);

  return {
    total,
    active,
    inactive: total - active,
    byRole: byRole.map((r) => ({ role: r.role, count: Number(r.count) })),
  };
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

// ────────────────────────────────────────────────────────────
// Active Sessions (who is online right now)
// ────────────────────────────────────────────────────────────

interface ActiveSessionRow {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
  lastLogin: string | null;
  lastActivity: string;
  sessionCount: string;
}

export async function getActiveSessions() {
  const rows = await sequelize.query<ActiveSessionRow>(
    `SELECT u.id, u.full_name AS "fullName", u.full_name_ar AS "fullNameAr",
            u.email, u.role, u.avatar_url AS "avatarUrl",
            u.last_login AS "lastLogin", u.last_activity AS "lastActivity",
            COALESCE(rt.cnt, 0) AS "sessionCount"
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) AS cnt
       FROM refresh_tokens
       WHERE revoked_at IS NULL AND expires_at > NOW() AND user_type = 'user'
       GROUP BY user_id
     ) rt ON rt.user_id::uuid = u.id
     WHERE u.last_activity > NOW() - INTERVAL '30 minutes'
       AND u.is_active = true
     ORDER BY u.last_activity DESC`,
    { type: QueryTypes.SELECT },
  );

  const TEN_MIN = 10 * 60 * 1000;

  return rows.map((r) => {
    const lastActivityMs = new Date(r.lastActivity).getTime();
    const ago = Date.now() - lastActivityMs;
    return {
      ...r,
      sessionCount: Number(r.sessionCount),
      status: ago <= TEN_MIN ? ("online" as const) : ("idle" as const),
    };
  });
}

// ────────────────────────────────────────────────────────────
// Force Logout (admin revokes all sessions for a user)
// ────────────────────────────────────────────────────────────
export async function forceLogout(targetId: string, adminId: string) {
  // Lazy imports to avoid circular dependency chain
  // (auth.service → playerAccount.model → sequelize.define at import time)
  const { revokeAllUserTokens } = await import("@modules/auth/auth.service");
  const { sendCustomSSE } =
    await import("@modules/notifications/notification.sse");

  if (targetId === adminId) {
    throw new AppError("Cannot force-logout yourself", 400);
  }

  const user = await findOrThrow(User, targetId, "User");

  // Revoke all refresh tokens
  await revokeAllUserTokens(targetId, "user");

  // Push immediate logout via SSE
  sendCustomSSE(targetId, "force_logout", {
    message: "You have been logged out by an administrator",
  });

  return { id: user.id, fullName: (user as any).fullName };
}
