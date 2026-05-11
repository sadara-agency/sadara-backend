import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("food_items", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fdc_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    calories: {
      type: DataTypes.DECIMAL(7, 1),
      allowNull: true,
    },
    protein_g: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    carbs_g: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    fat_g: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    fiber_g: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    sodium_mg: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: true,
    },
    default_serving_g: {
      type: DataTypes.DECIMAL(6, 1),
      allowNull: false,
      defaultValue: 100,
    },
    serving_label: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "usda",
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

  await queryInterface.sequelize.query(
    `CREATE INDEX food_items_name_gin ON food_items USING gin(to_tsvector('english', name));`,
  );

  // migration-lint: disable-next-line
  await queryInterface.addIndex("food_items", ["name"], {
    name: "food_items_name_btree",
  });
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("food_items");
}
