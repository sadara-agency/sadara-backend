import { QueryInterface, DataTypes } from "sequelize";

export async function up({ context: qi }: { context: QueryInterface }) {
  const [rows] = await qi.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  await qi.createTable("meal_plans", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "players", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    title_ar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
    },
    target_calories: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    target_protein_g: {
      type: DataTypes.DECIMAL(6, 1),
      allowNull: true,
    },
    target_carbs_g: {
      type: DataTypes.DECIMAL(6, 1),
      allowNull: true,
    },
    target_fat_g: {
      type: DataTypes.DECIMAL(6, 1),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
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

  await qi.addIndex("meal_plans", ["player_id"]);
  await qi.addIndex("meal_plans", ["status"]);
  await qi.addIndex("meal_plans", ["player_id", "status"]);

  await qi.createTable("meal_plan_items", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    meal_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "meal_plans", key: "id" },
      onDelete: "CASCADE",
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    meal_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    food_item_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "wellness_food_items", key: "id" },
      onDelete: "SET NULL",
    },
    custom_name: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    servings: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 1,
    },
    calories: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    protein_g: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    carbs_g: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    fat_g: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex("meal_plan_items", ["meal_plan_id"]);
  await qi.addIndex("meal_plan_items", [
    "meal_plan_id",
    "day_of_week",
    "meal_type",
  ]);
}

export async function down({ context: qi }: { context: QueryInterface }) {
  await qi.dropTable("meal_plan_items");
  await qi.dropTable("meal_plans");
}
