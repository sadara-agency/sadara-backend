import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "@config/database";

// ── Types ──

export type ConversationType = "direct" | "group";

// ═══════════════════════════════════════
// Conversation
// ═══════════════════════════════════════

export interface ConversationAttributes {
  id: string;
  type: ConversationType;
  title: string | null;
  titleAr: string | null;
  createdBy: string | null;
  lastMessageAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConversationCreationAttributes extends Optional<
  ConversationAttributes,
  "id" | "title" | "titleAr" | "lastMessageAt" | "createdAt" | "updatedAt"
> {}

export class Conversation
  extends Model<ConversationAttributes, ConversationCreationAttributes>
  implements ConversationAttributes
{
  declare id: string;
  declare type: ConversationType;
  declare title: string | null;
  declare titleAr: string | null;
  declare createdBy: string | null;
  declare lastMessageAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations (populated by include)
  declare participants?: ConversationParticipant[];
  declare messages?: Message[];
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "direct",
    },
    title: {
      type: DataTypes.STRING(255),
    },
    titleAr: {
      type: DataTypes.STRING(255),
      field: "title_ar",
    },
    createdBy: {
      type: DataTypes.UUID,
      field: "created_by",
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "last_message_at",
    },
  },
  {
    sequelize,
    tableName: "conversations",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════
// Conversation Participant
// ═══════════════════════════════════════

export interface ConversationParticipantAttributes {
  id: string;
  conversationId: string;
  userId: string;
  isArchived: boolean;
  isMuted: boolean;
  lastReadAt: Date | null;
  joinedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConversationParticipantCreationAttributes extends Optional<
  ConversationParticipantAttributes,
  | "id"
  | "isArchived"
  | "isMuted"
  | "lastReadAt"
  | "joinedAt"
  | "createdAt"
  | "updatedAt"
> {}

export class ConversationParticipant
  extends Model<
    ConversationParticipantAttributes,
    ConversationParticipantCreationAttributes
  >
  implements ConversationParticipantAttributes
{
  declare id: string;
  declare conversationId: string;
  declare userId: string;
  declare isArchived: boolean;
  declare isMuted: boolean;
  declare lastReadAt: Date | null;
  declare joinedAt: Date;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations
  declare user?: {
    id: string;
    fullName: string;
    fullNameAr: string | null;
    avatarUrl: string | null;
  };
}

ConversationParticipant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "conversation_id",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_archived",
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_muted",
    },
    lastReadAt: {
      type: DataTypes.DATE,
      field: "last_read_at",
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "joined_at",
    },
  },
  {
    sequelize,
    tableName: "conversation_participants",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════
// Message
// ═══════════════════════════════════════

export interface MessageAttributes {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentAr: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MessageCreationAttributes extends Optional<
  MessageAttributes,
  "id" | "contentAr" | "createdAt" | "updatedAt"
> {}

export class Message
  extends Model<MessageAttributes, MessageCreationAttributes>
  implements MessageAttributes
{
  declare id: string;
  declare conversationId: string;
  declare senderId: string;
  declare content: string;
  declare contentAr: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations
  declare sender?: {
    id: string;
    fullName: string;
    fullNameAr: string | null;
    avatarUrl: string | null;
  };
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "conversation_id",
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "sender_id",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contentAr: {
      type: DataTypes.TEXT,
      field: "content_ar",
    },
  },
  {
    sequelize,
    tableName: "messages",
    underscored: true,
    timestamps: true,
  },
);

// ═══════════════════════════════════════
// Associations
// ═══════════════════════════════════════

import { User } from "@modules/users/user.model";

Conversation.hasMany(ConversationParticipant, {
  as: "participants",
  foreignKey: "conversationId",
});
ConversationParticipant.belongsTo(Conversation, {
  foreignKey: "conversationId",
});

Conversation.hasMany(Message, {
  as: "messages",
  foreignKey: "conversationId",
});
Message.belongsTo(Conversation, {
  foreignKey: "conversationId",
});

ConversationParticipant.belongsTo(User, {
  as: "user",
  foreignKey: "userId",
});

Message.belongsTo(User, {
  as: "sender",
  foreignKey: "senderId",
});
