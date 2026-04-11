import { QueryInterface, DataTypes } from "sequelize";

export async function up({ context: qi }: { context: QueryInterface }) {
  await qi.createTable("social_media_accounts", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    platform: {
      type: DataTypes.ENUM(
        "twitter",
        "instagram",
        "linkedin",
        "facebook",
        "tiktok",
      ),
      allowNull: false,
    },
    account_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    access_token_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refresh_token_encrypted: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    platform_user_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    connected_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex("social_media_accounts", ["platform"]);
  await qi.addIndex("social_media_accounts", ["is_active"]);
}

export async function down({ context: qi }: { context: QueryInterface }) {
  await qi.dropTable("social_media_accounts");
}
