import { QueryInterface, DataTypes } from "sequelize";
import { tableExists, indexExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "player_inbox_items"))) {
    await queryInterface.createTable("player_inbox_items", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      player_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      issued_by_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "directive",
      },
      title: { type: DataTypes.STRING(500), allowNull: false },
      title_ar: { type: DataTypes.STRING(500), allowNull: true },
      body: { type: DataTypes.TEXT, allowNull: false },
      body_ar: { type: DataTypes.TEXT, allowNull: true },
      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "normal",
      },
      requires_acknowledgement: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      fine_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      fine_currency: { type: DataTypes.STRING(3), allowNull: true },
      due_at: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Sent",
      },
      first_viewed_at: { type: DataTypes.DATE, allowNull: true },
      acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      resolved_by_user_id: { type: DataTypes.UUID, allowNull: true },
      attachment_document_id: { type: DataTypes.UUID, allowNull: true },
      staff_notes: { type: DataTypes.TEXT, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    });
  }

  if (!(await tableExists(queryInterface, "player_inbox_events"))) {
    await queryInterface.createTable("player_inbox_events", {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      inbox_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "player_inbox_items", key: "id" },
        onDelete: "CASCADE",
      },
      actor_user_id: { type: DataTypes.UUID, allowNull: false },
      actor_role: { type: DataTypes.STRING(50), allowNull: true },
      event_type: { type: DataTypes.STRING(50), allowNull: false },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    });
  }

  if (!(await indexExists(queryInterface, "idx_pii_player"))) {
    await queryInterface.addIndex("player_inbox_items", ["player_id"], {
      name: "idx_pii_player",
    });
  }
  if (!(await indexExists(queryInterface, "idx_pii_player_status"))) {
    await queryInterface.addIndex(
      "player_inbox_items",
      ["player_id", "status"],
      { name: "idx_pii_player_status" },
    );
  }
  if (!(await indexExists(queryInterface, "idx_pie_item"))) {
    await queryInterface.addIndex("player_inbox_events", ["inbox_item_id"], {
      name: "idx_pie_item",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "player_inbox_events")) {
    await queryInterface.dropTable("player_inbox_events");
  }
  if (await tableExists(queryInterface, "player_inbox_items")) {
    await queryInterface.dropTable("player_inbox_items");
  }
}
