import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../Users/user.model';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { RegisterInput, LoginInput, InviteInput } from './auth.schema';

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
    isActive: false, // Inactive until admin approves or email is verified
  });

  const { passwordHash: _, ...safe } = user.get({ plain: true });
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
    isActive: true, // Admin-invited users are active immediately
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

// ── Change Password ──
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Current password is incorrect', 400);
  }

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await user.update({ passwordHash: newHash });

  return { message: 'Password changed successfully' };
}