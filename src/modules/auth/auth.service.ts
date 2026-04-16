import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op, QueryTypes } from "sequelize";
import { User } from "@modules/users/user.model";
import { PlayerAccount } from "@modules/portal/playerAccount.model";
import { sequelize } from "@config/database";
import { env } from "@config/env";
import { AppError } from "@middleware/errorHandler";
import { logger } from "@config/logger";
import {
  RegisterInput,
  LoginInput,
  InviteInput,
} from "@modules/auth/auth.validation";
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendInviteEmail,
  sendEmailVerificationEmail,
} from "@shared/utils/mail";

/** Email verification token validity — 24 hours. */
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generate a raw verification token and its SHA-256 hash, mirroring the
 * forgot-password pattern. The raw token is emailed; only the hash is stored.
 */
function createVerificationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/** Default role for self-registered users (no admin privileges). */
const DEFAULT_ROLE = "Analyst";

/** Account lockout settings */
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/** Refresh token expiry in ms (parsed from env, e.g. "30d") */
const REFRESH_TOKEN_MS = parseExpiry(env.jwt.refreshExpiresIn);

function parseExpiry(val: string): number {
  const match = val.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // fallback 30d
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * multipliers[unit];
}

/** Generate short-lived access JWT (uses JWT_EXPIRES_IN env, default 1h). */
function generateAccessToken(payload: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  playerId?: string | null;
}): string {
  return jwt.sign(payload, env.jwt.secret as jwt.Secret, {
    expiresIn: env.jwt.expiresIn as unknown as number,
  });
}

/** Create a refresh token, store its hash in DB, return the raw token. */
async function createRefreshToken(
  userId: string,
  userType: "user" | "player",
  family?: string,
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const tokenFamily = family || crypto.randomBytes(16).toString("hex");

  await sequelize.query(
    `INSERT INTO refresh_tokens (token_hash, user_id, user_type, family, expires_at)
     VALUES (:tokenHash, :userId, :userType, :family, :expiresAt)`,
    {
      replacements: {
        tokenHash,
        userId,
        userType,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
      },
    },
  );

  return rawToken;
}

/** Revoke all tokens in a family (used on reuse detection). */
async function revokeFamily(family: string): Promise<void> {
  await sequelize.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family = :family AND revoked_at IS NULL`,
    { replacements: { family } },
  );
}

/** Revoke all refresh tokens for a user (logout from all devices). */
export async function revokeAllUserTokens(
  userId: string,
  userType: "user" | "player" = "user",
): Promise<void> {
  await sequelize.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = :userId AND user_type = :userType AND revoked_at IS NULL`,
    { replacements: { userId, userType } },
  );
}

// ── Public Register (default role, no role selection) ──
export async function register(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, env.bcrypt.saltRounds);

  // Generate email verification token up-front so it's persisted atomically with the user row.
  const { rawToken, tokenHash } = createVerificationToken();
  const expiry = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  let user: User;
  try {
    user = await User.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      fullNameAr: input.fullNameAr,
      role: DEFAULT_ROLE,
      isActive: false,
      emailVerifiedAt: null,
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiry: expiry,
    });
  } catch (err: any) {
    if (err.name === "SequelizeUniqueConstraintError") {
      throw new AppError("Email already registered", 409);
    }
    throw err;
  }

  const safe = user.toJSON();

  // Send verification email (non-blocking — don't fail registration if email fails)
  const verifyUrl = `${env.frontend.url}/verify-email?token=${rawToken}`;
  sendEmailVerificationEmail(
    user.email,
    user.fullName || user.fullNameAr || "",
    verifyUrl,
  ).catch((err) =>
    logger.warn("Failed to send verification email", {
      email: user.email,
      error: (err as Error).message,
    }),
  );

  return { user: safe };
}

// ── Admin Invite (Admin assigns role) ──
export async function invite(input: InviteInput) {
  const passwordHash = await bcrypt.hash(input.password, env.bcrypt.saltRounds);

  let user: User;
  try {
    user = await User.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      fullNameAr: input.fullNameAr,
      role: input.role,
      isActive: true,
      // Admin-invited users are trusted — auto-verified so they skip the
      // email confirmation step and can log in as soon as they get the invite.
      emailVerifiedAt: new Date(),
    });
  } catch (err: any) {
    if (err.name === "SequelizeUniqueConstraintError") {
      throw new AppError("Email already registered", 409);
    }
    throw err;
  }

  const safe = user.toJSON();

  // Send invite email (non-blocking)
  const loginUrl = `${env.frontend.url}/login`;
  sendInviteEmail(
    user.email,
    user.fullName || user.fullNameAr || "",
    input.role,
    loginUrl,
  ).catch((err) =>
    logger.warn("Failed to send invite email", {
      email: user.email,
      error: (err as Error).message,
    }),
  );

  return { user: safe };
}

// ── Login (checks users table first, then player_accounts) ──
export async function login(input: LoginInput) {
  // ─── Attempt 1: Check the users table (Admin, Agent, Analyst, Scout, etc.) ───
  const user = await User.findOne({ where: { email: input.email } });

  if (user) {
    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new AppError(
        `Account is temporarily locked. Try again in ${remainingMin} minute(s).`,
        423,
      );
    }

    if (!(await bcrypt.compare(input.password, user.passwordHash))) {
      // Atomic increment to prevent race condition on concurrent failed logins.
      // Sequelize's typed update() rejects `Literal` values for column fields,
      // so the object is cast — the atomic SQL expression is the whole point.
      await User.update(
        {
          failedLoginAttempts: sequelize.literal(
            "COALESCE(failed_login_attempts, 0) + 1",
          ),
          lockedUntil: sequelize.literal(
            `CASE WHEN COALESCE(failed_login_attempts, 0) + 1 >= ${MAX_FAILED_ATTEMPTS} ` +
              `THEN NOW() + INTERVAL '${LOCKOUT_DURATION_MS / 1000} seconds' ` +
              `ELSE locked_until END`,
          ),
        } as any,
        { where: { id: user.id } },
      );
      throw new AppError("Invalid email or password", 401);
    }

    // Gate 1: email verification (self-service) — must be checked before
    // the admin-approval gate so the user gets the actionable message first.
    if (!user.emailVerifiedAt) {
      throw new AppError(
        "Please verify your email address before signing in.",
        403,
        true,
        "EMAIL_NOT_VERIFIED",
      );
    }

    // Gate 2: admin activation
    if (!user.isActive) {
      throw new AppError(
        "Your account is waiting for admin approval.",
        403,
        true,
        "PENDING_APPROVAL",
      );
    }

    // Successful login — reset lockout counters
    await user.update({
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    const userWithoutPassword = user.toJSON();

    // If the user is a Player, look up their playerId from player_accounts
    let playerId: string | null = null;
    if (user.role === "Player") {
      const pa = await PlayerAccount.findOne({
        where: { email: user.email },
        attributes: ["playerId"],
      });
      playerId = pa?.playerId ?? null;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ...(playerId ? { playerId } : {}),
    };

    return {
      user: { ...userWithoutPassword, ...(playerId ? { playerId } : {}) },
      token: generateAccessToken(tokenPayload),
      refreshToken: await createRefreshToken(user.id, "user"),
    };
  }

  // ─── Attempt 2: Check the player_accounts table ───
  const playerAccount = await PlayerAccount.findOne({
    where: { email: input.email },
  });

  if (!playerAccount) {
    throw new AppError("Invalid email or password", 401);
  }

  // Check if player account is locked
  if (
    playerAccount.lockedUntil &&
    new Date(playerAccount.lockedUntil) > new Date()
  ) {
    const remainingMs =
      new Date(playerAccount.lockedUntil).getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AppError(
      `Account is temporarily locked. Try again in ${remainingMin} minute(s).`,
      423,
    );
  }

  if (!(await bcrypt.compare(input.password, playerAccount.passwordHash))) {
    // Atomic increment — see matching comment in the users-table branch above.
    await PlayerAccount.update(
      {
        failedLoginAttempts: sequelize.literal(
          "COALESCE(failed_login_attempts, 0) + 1",
        ),
        lockedUntil: sequelize.literal(
          `CASE WHEN COALESCE(failed_login_attempts, 0) + 1 >= ${MAX_FAILED_ATTEMPTS} ` +
            `THEN NOW() + INTERVAL '${LOCKOUT_DURATION_MS / 1000} seconds' ` +
            `ELSE locked_until END`,
        ),
      } as any,
      { where: { id: playerAccount.id } },
    );
    throw new AppError("Invalid email or password", 401);
  }

  if (playerAccount.status !== "active") {
    throw new AppError(
      "Account is not yet activated. Please wait for admin approval.",
      403,
    );
  }

  // Fetch player profile for name/details
  const players = await sequelize.query<{
    first_name: string;
    last_name: string;
    first_name_ar: string | null;
    last_name_ar: string | null;
    photo_url: string | null;
  }>(
    `SELECT first_name, last_name, first_name_ar, last_name_ar, photo_url
     FROM players
     WHERE id = :playerId
     LIMIT 1`,
    {
      replacements: { playerId: playerAccount.playerId },
      type: QueryTypes.SELECT,
    },
  );

  const player = players[0];
  const fullName = player
    ? `${player.first_name} ${player.last_name}`
    : playerAccount.email;
  const fullNameAr = player
    ? `${player.first_name_ar || ""} ${player.last_name_ar || ""}`.trim()
    : null;

  // Update last_login and reset lockout counters
  await playerAccount.update({
    lastLogin: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  });

  // Build a user-like response so frontend works seamlessly
  const playerUser = {
    id: playerAccount.id,
    email: playerAccount.email,
    fullName,
    fullNameAr,
    role: "Player",
    avatarUrl: player?.photo_url || null,
    isActive: true,
    lastLogin: new Date(),
    playerId: playerAccount.playerId,
  };

  const tokenPayload = {
    id: playerAccount.id,
    email: playerAccount.email,
    fullName,
    role: "Player",
    playerId: playerAccount.playerId,
  };

  return {
    user: playerUser,
    token: generateAccessToken(tokenPayload),
    refreshToken: await createRefreshToken(playerAccount.id, "player"),
  };
}

// ── Refresh Session — rotate refresh token, issue new access token ──
export async function refreshSession(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Look up the refresh token
  const rows = await sequelize.query<{
    id: string;
    user_id: string;
    user_type: string;
    family: string;
    expires_at: Date;
    revoked_at: Date | null;
  }>(
    `SELECT id, user_id, user_type, family, expires_at, revoked_at
     FROM refresh_tokens WHERE token_hash = :tokenHash LIMIT 1`,
    { replacements: { tokenHash }, type: QueryTypes.SELECT },
  );

  const record = rows[0];
  if (!record) {
    throw new AppError("Invalid refresh token", 401);
  }

  // If this token was already revoked, check if it's a harmless race condition
  // (browser retry, service worker, concurrent tabs) or actual reuse.
  if (record.revoked_at) {
    const revokedAgo = Date.now() - new Date(record.revoked_at).getTime();
    const REUSE_GRACE_MS = 30_000; // 30-second grace window for concurrent tabs / network retries

    if (revokedAgo > REUSE_GRACE_MS) {
      // Genuine reuse — revoke entire family as a security measure
      await revokeFamily(record.family);
      logger.warn("Refresh token reuse detected — entire family revoked", {
        userId: record.user_id,
        family: record.family,
        revokedAgoMs: revokedAgo,
      });
      throw new AppError("Token reuse detected. Please log in again.", 401);
    }

    // Within grace window — likely a race condition. Return 409 so the
    // frontend can retry with the new cookie that was already set.
    logger.info("Refresh token race condition (within grace window)", {
      userId: record.user_id,
      revokedAgoMs: revokedAgo,
    });
    throw new AppError("Refresh already processed", 409);
  }

  // Check expiry
  if (new Date(record.expires_at) < new Date()) {
    throw new AppError("Refresh token expired", 401);
  }

  // Revoke the used token (single use)
  await sequelize.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id`,
    { replacements: { id: record.id } },
  );

  // Look up user to build the access token payload
  const userType = record.user_type as "user" | "player";
  let tokenPayload: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    playerId?: string | null;
  };

  if (userType === "user") {
    const user = await User.findByPk(record.user_id);
    if (!user || !user.isActive) {
      throw new AppError("Account not found or inactive", 401);
    }

    // If user is a Player, preserve playerId in refreshed token
    let playerId: string | null = null;
    if (user.role === "Player") {
      const pa = await PlayerAccount.findOne({
        where: { email: user.email },
        attributes: ["playerId"],
      });
      playerId = pa?.playerId ?? null;
    }

    tokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ...(playerId ? { playerId } : {}),
    };
  } else {
    const account = await PlayerAccount.findByPk(record.user_id);
    if (!account || account.status !== "active") {
      throw new AppError("Account not found or inactive", 401);
    }

    const playerData = await sequelize.query<{
      first_name: string;
      last_name: string;
    }>(
      `SELECT first_name, last_name FROM players WHERE id = :playerId LIMIT 1`,
      {
        replacements: { playerId: account.playerId },
        type: QueryTypes.SELECT,
      },
    );
    const p = playerData[0];
    tokenPayload = {
      id: account.id,
      email: account.email,
      fullName: p ? `${p.first_name} ${p.last_name}` : account.email,
      role: "Player",
      playerId: account.playerId,
    };
  }

  // Issue new tokens (rotation)
  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = await createRefreshToken(
    record.user_id,
    userType,
    record.family,
  );

  return { token: newAccessToken, refreshToken: newRefreshToken };
}

// ── Get Profile ──
export async function getProfile(userId: string) {
  // Check users table first (exclude sensitive fields)
  const user = await User.findByPk(userId);
  if (user) return user;

  // Fall back to player_accounts
  const account = await PlayerAccount.findByPk(userId);
  if (!account) throw new AppError("User not found", 404);

  let p:
    | {
        first_name: string;
        last_name: string;
        first_name_ar: string | null;
        last_name_ar: string | null;
        photo_url: string | null;
      }
    | undefined;

  if (account.playerId) {
    try {
      const playerData = await sequelize.query<typeof p & {}>(
        `SELECT first_name, last_name, first_name_ar, last_name_ar, photo_url
         FROM players WHERE id = :playerId LIMIT 1`,
        {
          replacements: { playerId: account.playerId },
          type: QueryTypes.SELECT,
        },
      );
      p = playerData[0];
    } catch (err) {
      logger.warn("Failed to load player data for profile", {
        userId,
        playerId: account.playerId,
        error: (err as Error).message,
      });
    }
  }

  return {
    id: account.id,
    email: account.email,
    fullName: p ? `${p.first_name} ${p.last_name}` : account.email,
    fullNameAr: p
      ? `${p.first_name_ar || ""} ${p.last_name_ar || ""}`.trim() || null
      : null,
    role: "Player",
    avatarUrl: p?.photo_url || null,
    isActive: account.status === "active",
    playerId: account.playerId,
  };
}

// ── Update Profile ──
export async function updateProfile(
  userId: string,
  data: { fullName?: string; fullNameAr?: string; avatarUrl?: string },
) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("User not found", 404);
  await user.update(data);
  return user.toJSON();
}

// ── Change Password (authenticated user) ──
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  // Check users table first
  const user = await User.findByPk(userId);

  if (user) {
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new AppError("Current password is incorrect", 400);
    }
    const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
    await user.update({ passwordHash: newHash });
    // Revoke all refresh tokens on password change
    await revokeAllUserTokens(userId, "user");
    sendPasswordChangedEmail(
      user.email,
      user.fullName || user.fullNameAr || "",
    ).catch((err) =>
      logger.warn("Failed to send email", { error: (err as Error).message }),
    );
    return { message: "Password changed successfully" };
  }

  // Fall back to player_accounts
  const account = await PlayerAccount.findByPk(userId);

  if (!account) throw new AppError("User not found", 404);

  if (!(await bcrypt.compare(currentPassword, account.passwordHash))) {
    throw new AppError("Current password is incorrect", 400);
  }

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await account.update({ passwordHash: newHash });
  // Revoke all refresh tokens on password change
  await revokeAllUserTokens(userId, "player");

  sendPasswordChangedEmail(account.email, "").catch((err) =>
    logger.warn("Failed to send email", { error: (err as Error).message }),
  );
  return { message: "Password changed successfully" };
}

// ════════════════════════════════════════════════════════════
// Forgot Password — generates a reset token, sends email
// ════════════════════════════════════════════════════════════
export async function forgotPassword(email: string) {
  const user = await User.findOne({ where: { email } });

  // Always return success to prevent email enumeration attacks
  if (!user) {
    return { message: "If this email exists, a reset link has been sent." };
  }

  // Generate a secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Store a hash of the token (never store raw tokens in DB)
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Token expires in 1 hour
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await user.update({
    resetToken: tokenHash,
    resetTokenExpiry: expiry,
  });

  // Build the reset URL
  const resetUrl = `${env.frontend.url}/reset-password?token=${rawToken}`;

  // Send the email (uses SMTP if configured, falls back to console.log)
  const emailSent = await sendPasswordResetEmail(
    user.email,
    user.fullName || user.fullNameAr || "",
    resetUrl,
  );

  if (!emailSent) {
    logger.warn("Password reset email failed to deliver", {
      userId: user.id,
      email: user.email,
    });
  }

  return {
    message: "If this email exists, a reset link has been sent.",
  };
}

// ════════════════════════════════════════════════════════════
// Reset Password — validates token and sets new password
// ════════════════════════════════════════════════════════════
export async function resetPassword(token: string, newPassword: string) {
  // Hash the incoming token to compare against stored hash
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    where: {
      resetToken: tokenHash,
      resetTokenExpiry: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  // Hash the new password and clear the reset token
  const passwordHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);

  await user.update({
    passwordHash,
    resetToken: null,
    resetTokenExpiry: null,
  });

  // Revoke all refresh tokens on password reset
  await revokeAllUserTokens(user.id, "user");

  // Send confirmation email (non-blocking)
  sendPasswordChangedEmail(
    user.email,
    user.fullName || user.fullNameAr || "",
  ).catch((err) =>
    logger.warn("Failed to send email", { error: (err as Error).message }),
  );

  return { message: "Password reset successfully. You can now log in." };
}

// ════════════════════════════════════════════════════════════
// Verify Email — validates token, marks account verified
// ════════════════════════════════════════════════════════════
export async function verifyEmail(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const user = await User.findOne({
    where: {
      emailVerificationToken: tokenHash,
      emailVerificationTokenExpiry: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    throw new AppError(
      "Invalid or expired verification link",
      400,
      true,
      "INVALID_VERIFICATION_TOKEN",
    );
  }

  if (user.emailVerifiedAt) {
    // Idempotent — clear any stale token and return success.
    await user.update({
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    });
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName },
      alreadyVerified: true,
    };
  }

  await user.update({
    emailVerifiedAt: new Date(),
    emailVerificationToken: null,
    emailVerificationTokenExpiry: null,
  });

  return {
    user: { id: user.id, email: user.email, fullName: user.fullName },
    alreadyVerified: false,
  };
}

// ════════════════════════════════════════════════════════════
// Resend Verification Email — regenerates token and re-sends
// ════════════════════════════════════════════════════════════
export async function resendVerificationEmail(email: string) {
  const user = await User.findOne({ where: { email } });

  // Always return success to prevent email enumeration (mirrors forgotPassword).
  if (!user) {
    return {
      message:
        "If an account exists for that email, a verification link has been sent.",
    };
  }

  // Idempotent: if already verified, do nothing but return success.
  if (user.emailVerifiedAt) {
    return {
      message:
        "If an account exists for that email, a verification link has been sent.",
    };
  }

  const { rawToken, tokenHash } = createVerificationToken();
  const expiry = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await user.update({
    emailVerificationToken: tokenHash,
    emailVerificationTokenExpiry: expiry,
  });

  const verifyUrl = `${env.frontend.url}/verify-email?token=${rawToken}`;
  sendEmailVerificationEmail(
    user.email,
    user.fullName || user.fullNameAr || "",
    verifyUrl,
  ).catch((err) =>
    logger.warn("Failed to send verification email", {
      email: user.email,
      error: (err as Error).message,
    }),
  );

  return {
    message:
      "If an account exists for that email, a verification link has been sent.",
  };
}
