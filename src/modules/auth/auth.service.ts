import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op, QueryTypes } from "sequelize";
import { User } from "../Users/user.model";
import { sequelize } from "../../config/database";
import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { RegisterInput, LoginInput, InviteInput } from "./auth.schema";
import {
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail,
} from "../../shared/utils/mail";

/** Default role for self-registered users (no admin privileges). */
const DEFAULT_ROLE = "Analyst";

/** Account lockout settings */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/** Generate JWT with user identity + role for frontend RBAC. */
function generateToken(payload: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  playerId?: string | null;
}): string {
  return jwt.sign(payload, env.jwt.secret as jwt.Secret, {
    expiresIn: env.jwt.expiresIn as any,
  });
}

// ── Public Register (default role, no role selection) ──
export async function register(input: RegisterInput) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(input.password, env.bcrypt.saltRounds);

  const user = await User.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    fullNameAr: input.fullNameAr,
    role: DEFAULT_ROLE,
    isActive: false,
  });

  const { passwordHash: _, ...safe } = user.get({ plain: true });

  // Send welcome email (non-blocking — don't fail registration if email fails)
  sendWelcomeEmail(user.email, user.fullName || user.fullNameAr || "").catch(
    () => {},
  );

  return { user: safe };
}

// ── Admin Invite (Admin assigns role) ──
export async function invite(input: InviteInput) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(input.password, env.bcrypt.saltRounds);

  const user = await User.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    fullNameAr: input.fullNameAr,
    role: input.role as any,
    isActive: true,
  });

  const { passwordHash: _, ...safe } = user.get({ plain: true });
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
      // Increment failed attempts and possibly lock
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      await user.update(updateData);
      throw new AppError("Invalid email or password", 401);
    }

    if (!user.isActive) {
      throw new AppError(
        "Account is not yet activated. Please wait for admin approval or verify your email.",
        403,
      );
    }

    // Successful login — reset lockout counters
    await user.update({
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    const {
      passwordHash,
      failedLoginAttempts: _f,
      lockedUntil: _l,
      ...userWithoutPassword
    } = user.get({ plain: true });

    return {
      user: userWithoutPassword,
      token: generateToken({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      }),
    };
  }

  // ─── Attempt 2: Check the player_accounts table ───
  const playerAccounts = await sequelize.query<{
    id: string;
    player_id: string;
    email: string;
    password_hash: string;
    status: string;
    last_login: Date | null;
  }>(
    `SELECT id, player_id, email, password_hash, status, last_login
     FROM player_accounts
     WHERE email = :email
     LIMIT 1`,
    { replacements: { email: input.email }, type: QueryTypes.SELECT },
  );

  const playerAccount = playerAccounts[0];

  if (!playerAccount) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!(await bcrypt.compare(input.password, playerAccount.password_hash))) {
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
      replacements: { playerId: playerAccount.player_id },
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

  // Update last_login
  await sequelize.query(
    `UPDATE player_accounts SET last_login = NOW() WHERE id = :id`,
    { replacements: { id: playerAccount.id }, type: QueryTypes.UPDATE },
  );

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
    playerId: playerAccount.player_id,
  };

  return {
    user: playerUser,
    token: generateToken({
      id: playerAccount.id,
      email: playerAccount.email,
      fullName,
      role: "Player",
      playerId: playerAccount.player_id,
    }),
  };
}

// ── Get Profile ──
export async function getProfile(userId: string) {
  // Check users table first (exclude sensitive fields)
  const user = await User.findByPk(userId, {
    attributes: {
      exclude: ["passwordHash", "inviteToken", "inviteTokenExpiry"],
    },
  });
  if (user) return user;

  // Fall back to player_accounts
  const accounts = await sequelize.query<{
    id: string;
    player_id: string;
    email: string;
    status: string;
  }>(
    `SELECT pa.id, pa.player_id, pa.email, pa.status,
            p.first_name, p.last_name, p.first_name_ar, p.last_name_ar, p.photo_url
     FROM player_accounts pa
     LEFT JOIN players p ON pa.player_id = p.id
     WHERE pa.id = :userId
     LIMIT 1`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  if (!accounts[0]) throw new AppError("User not found", 404);

  const acc: any = accounts[0];
  return {
    id: acc.id,
    email: acc.email,
    fullName: `${acc.first_name} ${acc.last_name}`,
    fullNameAr:
      `${acc.first_name_ar || ""} ${acc.last_name_ar || ""}`.trim() || null,
    role: "Player",
    avatarUrl: acc.photo_url || null,
    isActive: acc.status === "active",
    playerId: acc.player_id,
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
  return user;
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
    sendPasswordChangedEmail(
      user.email,
      user.fullName || user.fullNameAr || "",
    ).catch(() => {});
    return { message: "Password changed successfully" };
  }

  // Fall back to player_accounts
  const accounts = await sequelize.query<{
    id: string;
    password_hash: string;
    email: string;
  }>(
    `SELECT id, password_hash, email FROM player_accounts WHERE id = :userId LIMIT 1`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  if (!accounts[0]) throw new AppError("User not found", 404);

  if (!(await bcrypt.compare(currentPassword, accounts[0].password_hash))) {
    throw new AppError("Current password is incorrect", 400);
  }

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await sequelize.query(
    `UPDATE player_accounts SET password_hash = :hash WHERE id = :id`,
    { replacements: { hash: newHash, id: userId }, type: QueryTypes.UPDATE },
  );

  sendPasswordChangedEmail(accounts[0].email, "").catch(() => {});
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
  } as any);

  // Build the reset URL
  const resetUrl = `${env.frontend.url}/reset-password?token=${rawToken}`;

  // Send the email (uses SMTP if configured, falls back to console.log)
  const emailSent = await sendPasswordResetEmail(
    user.email,
    user.fullName || user.fullNameAr || "",
    resetUrl,
  );

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
  } as any);

  // Send confirmation email (non-blocking)
  sendPasswordChangedEmail(
    user.email,
    user.fullName || user.fullNameAr || "",
  ).catch(() => {});

  return { message: "Password reset successfully. You can now log in." };
}
