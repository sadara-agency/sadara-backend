import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("supplement_protocols", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dose: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    timing: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "recommended",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // migration-lint: disable-next-line
  await queryInterface.addIndex(
    "supplement_protocols",
    ["player_id", "is_active"],
    { name: "idx_supplement_protocols_player_active" },
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("supplement_protocols");
}
