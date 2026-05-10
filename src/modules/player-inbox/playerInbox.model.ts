import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

export type InboxCategory =
  | "management_order"
  | "disciplinary"
  | "fine"
  | "directive"
  | "mental_task";

export type InboxPriority = "low" | "normal" | "high" | "critical";

export type InboxStatus =
  | "Sent"
  | "Viewed"
  | "Acknowledged"
  | "Resolved"
  | "Cancelled";

export type InboxEventType =
  | "sent"
  | "viewed"
  | "acknowledged"
  | "resolved"
  | "cancelled";

// ── PlayerInboxItem ──

interface PlayerInboxItemAttributes {
  id: string;
  playerId: string;
  issuedByUserId: string;
  category: InboxCategory;
  title: string;
  titleAr: string | null;
  body: string;
  bodyAr: string | null;
  priority: InboxPriority;
  requiresAcknowledgement: boolean;
  fineAmount: string | null;
  fineCurrency: string | null;
  dueAt: Date | null;
  status: InboxStatus;
  firstViewedAt: Date | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  attachmentDocumentId: string | null;
  staffNotes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PlayerInboxItemCreationAttributes extends Optional<
  PlayerInboxItemAttributes,
  | "id"
  | "titleAr"
  | "bodyAr"
  | "priority"
  | "requiresAcknowledgement"
  | "fineAmount"
  | "fineCurrency"
  | "dueAt"
  | "status"
  | "firstViewedAt"
  | "acknowledgedAt"
  | "resolvedAt"
  | "resolvedByUserId"
  | "attachmentDocumentId"
  | "staffNotes"
  | "createdAt"
  | "updatedAt"
> {}

export class PlayerInboxItem
  extends Model<PlayerInboxItemAttributes, PlayerInboxItemCreationAttributes>
  implements PlayerInboxItemAttributes
{
  declare id: string;
  declare playerId: string;
  declare issuedByUserId: string;
  declare category: InboxCategory;
  declare title: string;
  declare titleAr: string | null;
  declare body: string;
  declare bodyAr: string | null;
  declare priority: InboxPriority;
  declare requiresAcknowledgement: boolean;
  declare fineAmount: string | null;
  declare fineCurrency: string | null;
  declare dueAt: Date | null;
  declare status: InboxStatus;
  declare firstViewedAt: Date | null;
  declare acknowledgedAt: Date | null;
  declare resolvedAt: Date | null;
  declare resolvedByUserId: string | null;
  declare attachmentDocumentId: string | null;
  declare staffNotes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PlayerInboxItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerId: { type: DataTypes.UUID, allowNull: false, field: "player_id" },
    issuedByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "issued_by_user_id",
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "directive",
    },
    title: { type: DataTypes.STRING(500), allowNull: false },
    titleAr: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "title_ar",
    },
    body: { type: DataTypes.TEXT, allowNull: false },
    bodyAr: { type: DataTypes.TEXT, allowNull: true, field: "body_ar" },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "normal",
    },
    requiresAcknowledgement: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "requires_acknowledgement",
    },
    fineAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "fine_amount",
    },
    fineCurrency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      field: "fine_currency",
    },
    dueAt: { type: DataTypes.DATE, allowNull: true, field: "due_at" },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Sent",
    },
    firstViewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "first_viewed_at",
    },
    acknowledgedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "acknowledged_at",
    },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: "resolved_at" },
    resolvedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "resolved_by_user_id",
    },
    attachmentDocumentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "attachment_document_id",
    },
    staffNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "staff_notes",
    },
  },
  {
    sequelize,
    tableName: "player_inbox_items",
    underscored: true,
    timestamps: true,
  },
);

// ── PlayerInboxEvent ──

interface PlayerInboxEventAttributes {
  id: string;
  inboxItemId: string;
  actorUserId: string;
  actorRole: string | null;
  eventType: InboxEventType;
  metadata: Record<string, unknown> | null;
  createdAt?: Date;
}

interface PlayerInboxEventCreationAttributes extends Optional<
  PlayerInboxEventAttributes,
  "id" | "actorRole" | "metadata" | "createdAt"
> {}

export class PlayerInboxEvent
  extends Model<PlayerInboxEventAttributes, PlayerInboxEventCreationAttributes>
  implements PlayerInboxEventAttributes
{
  declare id: string;
  declare inboxItemId: string;
  declare actorUserId: string;
  declare actorRole: string | null;
  declare eventType: InboxEventType;
  declare metadata: Record<string, unknown> | null;
  declare readonly createdAt: Date;
}

PlayerInboxEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    inboxItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "inbox_item_id",
    },
    actorUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "actor_user_id",
    },
    actorRole: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "actor_role",
    },
    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "event_type",
    },
    metadata: { type: DataTypes.JSONB, allowNull: true },
  },
  {
    sequelize,
    tableName: "player_inbox_events",
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);

PlayerInboxItem.hasMany(PlayerInboxEvent, {
  foreignKey: "inboxItemId",
  as: "events",
});
PlayerInboxEvent.belongsTo(PlayerInboxItem, {
  foreignKey: "inboxItemId",
  as: "item",
});

export default PlayerInboxItem;
