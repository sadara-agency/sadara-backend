import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("workout_plans", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    player_id: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    name_ar: { type: DataTypes.STRING(255), allowNull: true },
    goal: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "strength",
    },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    duration_weeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "draft",
    },
    phase_config: { type: DataTypes.JSONB, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.createTable("workout_plan_days", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    day_of_week: { type: DataTypes.INTEGER, allowNull: false },
    is_rest: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    label: { type: DataTypes.STRING(100), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.createTable("workout_plan_exercises", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    plan_day_id: { type: DataTypes.UUID, allowNull: false },
    exercise_id: { type: DataTypes.UUID, allowNull: false },
    order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    target_sets: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    target_reps: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "8-12",
    },
    target_weight_kg: { type: DataTypes.DECIMAL(6, 1), allowNull: true },
    rest_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 90,
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.createTable("workout_sessions", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    plan_id: { type: DataTypes.UUID, allowNull: false },
    plan_day_id: { type: DataTypes.UUID, allowNull: false },
    player_id: { type: DataTypes.UUID, allowNull: false },
    scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    started_at: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.createTable("workout_set_logs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    session_id: { type: DataTypes.UUID, allowNull: false },
    exercise_id: { type: DataTypes.UUID, allowNull: false },
    set_number: { type: DataTypes.INTEGER, allowNull: false },
    actual_reps: { type: DataTypes.INTEGER, allowNull: true },
    actual_weight_kg: { type: DataTypes.DECIMAL(6, 1), allowNull: true },
    rpe: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    logged_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
  });

  // Indexes
  await queryInterface.addIndex("workout_plans", ["player_id"]);
  await queryInterface.addIndex("workout_plans", ["status"]);
  await queryInterface.addIndex("workout_plan_days", ["plan_id"]);
  await queryInterface.addIndex("workout_plan_exercises", ["plan_day_id"]);
  await queryInterface.addIndex("workout_sessions", ["plan_id"]);
  await queryInterface.addIndex("workout_sessions", [
    "player_id",
    "scheduled_date",
  ]);
  await queryInterface.addIndex("workout_set_logs", ["session_id"]);

  // Seed permissions for workout-plans module
  const tableOk = await tableExists(queryInterface, "role_permissions");
  if (!tableOk) return;

  const MODULE = "workout-plans";
  const perms = [
    {
      role: "Admin",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    },
    {
      role: "Manager",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    },
    {
      role: "SportingDirector",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "Coach",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      role: "SkillCoach",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      role: "TacticalCoach",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      role: "FitnessCoach",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      role: "GoalkeeperCoach",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      role: "GymCoach",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      role: "Player",
      canCreate: false,
      canRead: true,
      canUpdate: true,
      canDelete: false,
    },
    {
      role: "Analyst",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "Executive",
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "Scout",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "Legal",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "Finance",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "NutritionSpecialist",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "MentalCoach",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    },
    {
      role: "GraphicDesigner",
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
    },
  ];

  for (const p of perms) {
    await queryInterface.sequelize.query(
      `INSERT INTO role_permissions (id, role, module, can_create, can_read, can_update, can_delete, created_at, updated_at)
       VALUES (gen_random_uuid(), :role, :module, :canCreate, :canRead, :canUpdate, :canDelete, NOW(), NOW())
       ON CONFLICT (role, module) DO UPDATE SET
         can_create = EXCLUDED.can_create,
         can_read   = EXCLUDED.can_read,
         can_update = EXCLUDED.can_update,
         can_delete = EXCLUDED.can_delete,
         updated_at = NOW()`,
      { replacements: { ...p, module: MODULE } },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("workout_set_logs");
  await queryInterface.dropTable("workout_sessions");
  await queryInterface.dropTable("workout_plan_exercises");
  await queryInterface.dropTable("workout_plan_days");
  await queryInterface.dropTable("workout_plans");

  const tableOk = await tableExists(queryInterface, "role_permissions");
  if (!tableOk) return;
  await queryInterface.sequelize.query(
    `DELETE FROM role_permissions WHERE module = 'workout-plans'`,
  );
}
