/**
 * DB-backed role verification — defense-in-depth for RBAC bypass checks.
 *
 * JWT claims are trusted after signature verification, but this utility
 * adds a second layer by confirming the role stored in the DB still matches.
 * Results are cached in Redis (60s TTL) to avoid per-request DB hits.
 */
import { cacheGet, cacheSet, CacheTTL } from "@shared/utils/cache";
import { sequelize } from "@config/database";
import { QueryTypes } from "sequelize";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";

const VERIFY_CACHE_PREFIX = "role-verify";
const VERIFY_TTL = 60; // 60 seconds

interface RoleRow {
  role: string;
  is_active: boolean;
}

/**
 * Verify that a user's current DB role matches the expected role from JWT.
 * Throws 403 if the role has changed or the user is inactive/missing.
 *
 * @param userId  - The user's UUID (from req.user.id)
 * @param expectedRole - The role claimed in the JWT (from req.user.role)
 */
export async function verifyUserRole(
  userId: string,
  expectedRole: string,
): Promise<void> {
  const cacheKey = `${VERIFY_CACHE_PREFIX}:${userId}`;

  // 1. Check Redis cache
  try {
    const cached = await cacheGet<RoleRow>(cacheKey);
    if (cached) {
      if (!cached.is_active) {
        throw new AppError("Account is deactivated", 403);
      }
      if (cached.role !== expectedRole) {
        throw new AppError("Role has changed, please re-authenticate", 403);
      }
      return; // Cache hit, role matches
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Redis failure — fall through to DB
    logger.warn("Role verify cache read failed", {
      userId,
      error: (err as Error).message,
    });
  }

  // 2. Query DB
  const [row] = await sequelize.query<RoleRow>(
    `SELECT role, is_active FROM users WHERE id = :userId LIMIT 1`,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    },
  );

  if (!row) {
    throw new AppError("User not found", 403);
  }

  // 3. Cache the result
  await cacheSet(cacheKey, row, VERIFY_TTL).catch((err) =>
    logger.warn("Role verify cache write failed", {
      userId,
      error: (err as Error).message,
    }),
  );

  // 4. Validate
  if (!row.is_active) {
    throw new AppError("Account is deactivated", 403);
  }

  if (row.role !== expectedRole) {
    throw new AppError("Role has changed, please re-authenticate", 403);
  }
}
