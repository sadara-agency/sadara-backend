import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User } from '../Users/user.model';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { RegisterInput, LoginInput, InviteInput } from './auth.schema';
import { sendPasswordResetEmail, sendPasswordChangedEmail, sendWelcomeEmail } from '../../shared/utils/mail';

/** Default role for self-registered users (no admin privileges). */
const DEFAULT_ROLE = 'Analyst';

/** Generate JWT with user identity + role for frontend RBAC. */
function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    env.jwt.secret as jwt.Secret,
    { expiresIn: env.jwt.expiresIn as any }
  );
}

// ── Public Register (default role, no role selection) ──
export async function register(input: RegisterInput) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw new AppError('Email already registered', 409);

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
  sendWelcomeEmail(user.email, user.fullName || user.fullNameAr || '').catch(() => {});

  return { user: safe };
}

// ── Admin Invite (Admin assigns role) ──
export async function invite(input: InviteInput) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw new AppError('Email already registered', 409);

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

// ── Login ──
export async function login(input: LoginInput) {
  const user = await User.findOne({ where: { email: input.email } });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is not yet activated. Please wait for admin approval or verify your email.', 403);
  }

  await user.update({ lastLogin: new Date() });
  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });

  return {
    user: userWithoutPassword,
    token: generateToken(user),
  };
}

// ── Get Profile ──
export async function getProfile(userId: string) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

// ── Update Profile ──
export async function updateProfile(userId: string, data: { fullName?: string; fullNameAr?: string; avatarUrl?: string }) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);
  await user.update(data);
  return user;
}

// ── Change Password (authenticated user) ──
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 400);
  }

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await user.update({ passwordHash: newHash });

  // Send confirmation email (non-blocking)
  sendPasswordChangedEmail(user.email, user.fullName || user.fullNameAr || '').catch(() => {});

  return { message: 'Password changed successfully' };
}

// ════════════════════════════════════════════════════════════
// Forgot Password — generates a reset token, sends email
// ════════════════════════════════════════════════════════════
export async function forgotPassword(email: string) {
  const user = await User.findOne({ where: { email } });

  // Always return success to prevent email enumeration attacks
  if (!user) {
    return { message: 'If this email exists, a reset link has been sent.' };
  }

  // Generate a secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Store a hash of the token (never store raw tokens in DB)
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

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
    user.fullName || user.fullNameAr || '',
    resetUrl,
  );

  // Also log to console as backup (useful for Railway logs)
  console.log('═══════════════════════════════════════════════');
  console.log('🔑 PASSWORD RESET REQUEST');
  console.log(`   Email:      ${email}`);
  console.log(`   Email sent: ${emailSent ? '✅ Yes' : '❌ No (logged only)'}`);
  console.log(`   Expiry:     ${expiry.toISOString()}`);
  if (!emailSent) {
    console.log(`   Token:      ${rawToken}`);
    console.log(`   URL:        ${resetUrl}`);
  }
  console.log('═══════════════════════════════════════════════');

  // In dev mode, return the token in the response for testing
  const isDev = env.nodeEnv !== 'production';

  return {
    message: 'If this email exists, a reset link has been sent.',
    ...(isDev && { resetUrl, token: rawToken }),
  };
}

// ════════════════════════════════════════════════════════════
// Reset Password — validates token and sets new password
// ════════════════════════════════════════════════════════════
export async function resetPassword(token: string, newPassword: string) {
  // Hash the incoming token to compare against stored hash
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    where: {
      resetToken: tokenHash,
      resetTokenExpiry: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Hash the new password and clear the reset token
  const passwordHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);

  await user.update({
    passwordHash,
    resetToken: null,
    resetTokenExpiry: null,
  } as any);

  // Send confirmation email (non-blocking)
  sendPasswordChangedEmail(user.email, user.fullName || user.fullNameAr || '').catch(() => {});

  return { message: 'Password reset successfully. You can now log in.' };
}