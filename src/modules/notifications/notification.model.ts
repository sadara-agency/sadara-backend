import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

export type NotificationType = 'injury' | 'contract' | 'payment' | 'match' | 'referral' | 'document' | 'task' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

interface NotificationAttributes {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    titleAr?: string | null;
    body?: string | null;
    bodyAr?: string | null;
    link?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    isRead: boolean;
    isDismissed: boolean;
    priority: NotificationPriority;
    createdAt?: Date;
}

interface NotificationCreation extends Optional<NotificationAttributes, 'id' | 'isRead' | 'isDismissed' | 'priority' | 'createdAt'> { }

export class Notification extends Model<NotificationAttributes, NotificationCreation> implements NotificationAttributes {
    declare id: string;
    declare userId: string;
    declare type: NotificationType;
    declare title: string;
    declare titleAr: string | null;
    declare body: string | null;
    declare bodyAr: string | null;
    declare link: string | null;
    declare sourceType: string | null;
    declare sourceId: string | null;
    declare isRead: boolean;
    declare isDismissed: boolean;
    declare priority: NotificationPriority;
    declare createdAt: Date;
}

Notification.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'info' },
    title: { type: DataTypes.STRING(500), allowNull: false },
    titleAr: { type: DataTypes.STRING(500), field: 'title_ar' },
    body: { type: DataTypes.TEXT },
    bodyAr: { type: DataTypes.TEXT, field: 'body_ar' },
    link: { type: DataTypes.STRING(500) },
    sourceType: { type: DataTypes.STRING(50), field: 'source_type' },
    sourceId: { type: DataTypes.UUID, field: 'source_id' },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_read' },
    isDismissed: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_dismissed' },
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
}, {
    sequelize,
    tableName: 'notifications',
    underscored: true,
    timestamps: true,
    updatedAt: false,  // no updated_at column
});