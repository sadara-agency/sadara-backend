import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  // Create the table without inline FK references so this migration is safe
  // on a fresh DB where players/matches/clubs/users may not yet exist.
  // FKs are added afterward, guarded by tableExists checks on each parent.
  await queryInterface.createTable("designs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    type: { type: DataTypes.STRING(50), allowNull: false },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "draft",
    },
    format: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "square_1080",
    },
    player_id: { type: DataTypes.UUID, allowNull: true },
    match_id: { type: DataTypes.UUID, allowNull: true },
    club_id: { type: DataTypes.UUID, allowNull: true },
    asset_url: { type: DataTypes.STRING(500), allowNull: true },
    asset_width: { type: DataTypes.INTEGER, allowNull: true },
    asset_height: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.JSONB, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    published_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  // Indexes
  await queryInterface.addIndex("designs", ["status"], {
    name: "idx_designs_status",
  });
  await queryInterface.addIndex("designs", ["type"], {
    name: "idx_designs_type",
  });
  await queryInterface.addIndex("designs", ["player_id"], {
    name: "idx_designs_player_id",
  });
  await queryInterface.addIndex("designs", ["match_id"], {
    name: "idx_designs_match_id",
  });
  await queryInterface.addIndex("designs", ["created_by"], {
    name: "idx_designs_created_by",
  });

  // FK constraints — each guarded so a fresh DB run short-circuits safely
  // when the parent table hasn't been created by an earlier migration yet.
  if (await tableExists(queryInterface, "players")) {
    await queryInterface.addConstraint("designs", {
      type: "foreign key",
      fields: ["player_id"],
      name: "designs_player_id_fkey",
      references: { table: "players", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }
  if (await tableExists(queryInterface, "matches")) {
    await queryInterface.addConstraint("designs", {
      type: "foreign key",
      fields: ["match_id"],
      name: "designs_match_id_fkey",
      references: { table: "matches", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }
  if (await tableExists(queryInterface, "clubs")) {
    await queryInterface.addConstraint("designs", {
      type: "foreign key",
      fields: ["club_id"],
      name: "designs_club_id_fkey",
      references: { table: "clubs", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }
  if (await tableExists(queryInterface, "users")) {
    await queryInterface.addConstraint("designs", {
      type: "foreign key",
      fields: ["created_by"],
      name: "designs_created_by_fkey",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("designs");
}
