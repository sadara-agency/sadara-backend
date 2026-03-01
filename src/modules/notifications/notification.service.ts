import { Op } from 'sequelize';
import { Notification, NotificationType, NotificationPriority } from './notification.model';
import { User } from '../Users/user.model';
import { parsePagination, buildMeta } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';

// ── Create a single notification ──

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  titleAr?: string;
  body?: string;
  bodyAr?: string;
  link?: string;
  sourceType?: string;
  sourceId?: string;
  priority?: NotificationPriority;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await Notification.create(input as any);
  } catch (err: any) {
    // Unique constraint violation = duplicate → skip silently
    if (err.name === 'SequelizeUniqueConstraintError') {
      logger.debug(`Duplicate notification skipped: ${input.sourceType}/${input.sourceId} for user ${input.userId}`);
      return null;
    }
    throw err;
  }
}

// ── Notify all users with specific roles ──

export async function notifyByRole(
  roles: string[],
  input: Omit<CreateNotificationInput, 'userId'>
) {
  const users = await User.findAll({
    where: { role: { [Op.in]: roles }, isActive: true },
    attributes: ['id'],
  });

  const results = await Promise.allSettled(
    users.map(u => createNotification({ ...input, userId: u.id }))
  );

  const created = results.filter(r => r.status === 'fulfilled' && r.value).length;
  logger.info(`Notified ${created}/${users.length} users (roles: ${roles.join(',')}) — ${input.type}: ${input.title}`);
  return created;
}

// ── Notify a specific user ──

export async function notifyUser(userId: string, input: Omit<CreateNotificationInput, 'userId'>) {
  return createNotification({ ...input, userId });
}

// ── List notifications for a user ──

export async function listNotifications(userId: string, queryParams: any) {
  const { limit, offset, page } = parsePagination(queryParams, 'createdAt');
  const where: any = { userId, isDismissed: false };

  if (queryParams.unreadOnly === 'true') where.isRead = false;
  if (queryParams.type) where.type = queryParams.type;

  const { count, rows } = await Notification.findAndCountAll({
    where, limit, offset,
    order: [['createdAt', 'DESC']],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
}

// ── Unread count ──

export async function getUnreadCount(userId: string) {
  return Notification.count({ where: { userId, isRead: false, isDismissed: false } });
}

// ── Mark as read ──

export async function markAsRead(userId: string, notificationId: string) {
  const [updated] = await Notification.update(
    { isRead: true },
    { where: { id: notificationId, userId } }
  );
  return updated > 0;
}

// ── Mark all as read ──

export async function markAllAsRead(userId: string) {
  const [updated] = await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );
  return updated;
}

// ── Dismiss ──

export async function dismissNotification(userId: string, notificationId: string) {
  const [updated] = await Notification.update(
    { isDismissed: true },
    { where: { id: notificationId, userId } }
  );
  return updated > 0;
}

// ── Cleanup old notifications (called by cron) ──

export async function cleanupOldNotifications(daysOld = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const deleted = await Notification.destroy({
    where: { createdAt: { [Op.lt]: cutoff } },
  });

  if (deleted > 0) logger.info(`Cleaned up ${deleted} notifications older than ${daysOld} days`);
  return deleted;
}