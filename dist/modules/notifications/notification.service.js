"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyByRole = notifyByRole;
exports.notifyUser = notifyUser;
exports.listNotifications = listNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.dismissNotification = dismissNotification;
exports.cleanupOldNotifications = cleanupOldNotifications;
const sequelize_1 = require("sequelize");
const notification_model_1 = require("./notification.model");
const user_model_1 = require("../Users/user.model");
const pagination_1 = require("../../shared/utils/pagination");
const logger_1 = require("../../config/logger");
async function createNotification(input) {
    try {
        return await notification_model_1.Notification.create(input);
    }
    catch (err) {
        // Unique constraint violation = duplicate → skip silently
        if (err.name === 'SequelizeUniqueConstraintError') {
            logger_1.logger.debug(`Duplicate notification skipped: ${input.sourceType}/${input.sourceId} for user ${input.userId}`);
            return null;
        }
        throw err;
    }
}
// ── Notify all users with specific roles ──
async function notifyByRole(roles, input) {
    const users = await user_model_1.User.findAll({
        where: { role: { [sequelize_1.Op.in]: roles }, isActive: true },
        attributes: ['id'],
    });
    const results = await Promise.allSettled(users.map(u => createNotification({ ...input, userId: u.id })));
    const created = results.filter(r => r.status === 'fulfilled' && r.value).length;
    logger_1.logger.info(`Notified ${created}/${users.length} users (roles: ${roles.join(',')}) — ${input.type}: ${input.title}`);
    return created;
}
// ── Notify a specific user ──
async function notifyUser(userId, input) {
    return createNotification({ ...input, userId });
}
// ── List notifications for a user ──
async function listNotifications(userId, queryParams) {
    const { limit, offset, page } = (0, pagination_1.parsePagination)(queryParams, 'createdAt');
    const where = { userId, isDismissed: false };
    if (queryParams.unreadOnly === 'true')
        where.isRead = false;
    if (queryParams.type)
        where.type = queryParams.type;
    const { count, rows } = await notification_model_1.Notification.findAndCountAll({
        where, limit, offset,
        order: [['createdAt', 'DESC']],
    });
    return { data: rows, meta: (0, pagination_1.buildMeta)(count, page, limit) };
}
// ── Unread count ──
async function getUnreadCount(userId) {
    return notification_model_1.Notification.count({ where: { userId, isRead: false, isDismissed: false } });
}
// ── Mark as read ──
async function markAsRead(userId, notificationId) {
    const [updated] = await notification_model_1.Notification.update({ isRead: true }, { where: { id: notificationId, userId } });
    return updated > 0;
}
// ── Mark all as read ──
async function markAllAsRead(userId) {
    const [updated] = await notification_model_1.Notification.update({ isRead: true }, { where: { userId, isRead: false } });
    return updated;
}
// ── Dismiss ──
async function dismissNotification(userId, notificationId) {
    const [updated] = await notification_model_1.Notification.update({ isDismissed: true }, { where: { id: notificationId, userId } });
    return updated > 0;
}
// ── Cleanup old notifications (called by cron) ──
async function cleanupOldNotifications(daysOld = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const deleted = await notification_model_1.Notification.destroy({
        where: { createdAt: { [sequelize_1.Op.lt]: cutoff } },
    });
    if (deleted > 0)
        logger_1.logger.info(`Cleaned up ${deleted} notifications older than ${daysOld} days`);
    return deleted;
}
//# sourceMappingURL=notification.service.js.map