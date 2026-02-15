import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../Users/user.model';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { RegisterInput, LoginInput } from './auth.schema';

function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    env.jwt.secret as jwt.Secret,
    { expiresIn: env.jwt.expiresIn as any }
  );
}

// ── Register ──
export async function register(input: RegisterInput) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(input.password, env.bcrypt.saltRounds);

  const user = await User.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    fullNameAr: input.fullNameAr,
    role: input.role as any,
  });

  return { user, token: generateToken(user) };
}

// ── Login ──
export async function login(input: LoginInput) {
  const user = await User.findOne({ where: { email: input.email } });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) throw new AppError('Account is deactivated', 403);

  // Simple update logic
  await user.update({ lastLogin: new Date() });
  const { passwordHash, ...userWithoutPassword } = user.get({ plain: true });

  return {
    user: userWithoutPassword,
    token: generateToken(user)
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

  // Sequelize automatically ignores undefined fields! No more "idx++" loops.
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