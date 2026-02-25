import { Router, Response } from 'express';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { User } from '../Users/user.model';
import { AuthRequest } from '../../shared/types';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse';
import { logAudit, buildAuditContext } from '../../shared/utils/audit';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../config/database';

const router = Router();
router.use(authenticate);

// ── Schemas ──

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const teamQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  fullNameAr: z.string().max(255).optional(),
  role: z.enum(['Admin', 'Manager', 'Analyst', 'Scout', 'Player']).optional(),
  isActive: z.boolean().optional(),
});

const notificationPrefsSchema = z.object({
  contracts: z.boolean().optional(),
  offers: z.boolean().optional(),
  matches: z.boolean().optional(),
  tasks: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
});

const DEFAULT_NOTIFICATION_PREFS = {
  contracts: true,
  offers: true,
  matches: true,
  tasks: true,
  email: true,
  push: false,
  sms: false,
};

const SAFE_ATTRS = ['id', 'email', 'fullName', 'fullNameAr', 'role', 'avatarUrl', 'isActive', 'lastLogin', 'createdAt'] as const;

// ══════════════════════════════════════════
// PROFILE (current user)
// ══════════════════════════════════════════

router.get('/profile', asyncHandler(async (req: AuthRequest, res: Response) => {
  let user = await User.findByPk(req.user!.id, {
    attributes: [...SAFE_ATTRS],
  });

  // If user was deleted/DB reseeded, return JWT payload as fallback
  if (!user) {
    sendSuccess(res, {
      id: req.user!.id,
      email: req.user!.email,
      fullName: req.user!.fullName,
      fullNameAr: null,
      role: req.user!.role,
      avatarUrl: null,
      isActive: true,
      twoFactorEnabled: false,
    });
    return;
  }

  const [tfRow] = await sequelize.query(
    `SELECT two_factor_enabled FROM users WHERE id = $1`,
    { bind: [req.user!.id], type: QueryTypes.SELECT }
  ) as any[];

  const result = { ...user.toJSON(), twoFactorEnabled: tfRow?.two_factor_enabled ?? false };
  sendSuccess(res, result);
}));

router.patch('/profile', validate(updateProfileSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) throw new AppError('User not found', 404);
  await user.update(req.body);
  await logAudit('UPDATE', 'users', user.id, buildAuditContext(req.user!, req.ip), 'Profile updated');
  sendSuccess(res, user, 'Profile updated');
}));

router.post('/change-password', validate(changePasswordSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  const hash = await bcrypt.hash(req.body.newPassword, 12);
  await user.update({ passwordHash: hash } as any);
  await logAudit('UPDATE', 'users', user.id, buildAuditContext(req.user!, req.ip), 'Password changed');
  sendSuccess(res, null, 'Password changed successfully');
}));

// ══════════════════════════════════════════
// NOTIFICATION PREFERENCES
// ══════════════════════════════════════════

router.get('/notifications', asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByPk(req.user!.id, {
    attributes: ['id', 'notificationPreferences'],
  });

  sendSuccess(res, user?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS);
}));

router.patch('/notifications', validate(notificationPrefsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) throw new AppError('User not found', 404);

  const currentPrefs = user.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFS;
  const updatedPrefs = { ...currentPrefs, ...req.body };

  await user.update({ notificationPreferences: updatedPrefs });

  await logAudit(
    'UPDATE', 'users', user.id,
    buildAuditContext(req.user!, req.ip),
    'Notification preferences updated',
  );

  sendSuccess(res, updatedPrefs, 'Notification preferences updated');
}));

// ══════════════════════════════════════════
// TEAM (users list — Admin/Manager only)
// ══════════════════════════════════════════

router.get('/team', authorize('Admin', 'Manager'), validate(teamQuerySchema, 'query'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit, offset, page } = parsePagination(req.query as any, 'createdAt');
  const where: any = {};
  if ((req.query as any).role) where.role = (req.query as any).role;
  if ((req.query as any).isActive !== undefined) where.isActive = (req.query as any).isActive;
  if ((req.query as any).search) {
    const s = (req.query as any).search;
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${s}%` } },
      { fullNameAr: { [Op.iLike]: `%${s}%` } },
      { email: { [Op.iLike]: `%${s}%` } },
    ];
  }
  const { count, rows } = await User.findAndCountAll({
    where, limit, offset, order: [['created_at', 'DESC']], attributes: [...SAFE_ATTRS],
  });
  sendPaginated(res, rows, buildMeta(count, page, limit));
}));

router.patch('/team/:id', authorize('Admin'), validate(updateUserSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  await user.update(req.body);
  await logAudit('UPDATE', 'users', user.id, buildAuditContext(req.user!, req.ip), `Team member updated: ${user.fullName}`);
  sendSuccess(res, user, 'User updated');
}));

export default router;