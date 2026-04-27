import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [tableRows] = await (queryInterface.sequelize as any).query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salary_benchmarks'`,
  );
  if ((tableRows as any[]).length > 0) return;

  await queryInterface.createTable("salary_benchmarks", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    position: { type: DataTypes.STRING(20), allowNull: false },
    tier: { type: DataTypes.STRING(10), allowNull: false },
    annual_salary_sar: { type: DataTypes.DECIMAL(12, 0), allowNull: false },
    league: { type: DataTypes.STRING(50), allowNull: false },
    player_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Pro",
    },
    season: { type: DataTypes.STRING(10), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  const [idxRows] = await (queryInterface.sequelize as any).query(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_salary_benchmarks_position_league'`,
  );
  if ((idxRows as any[]).length === 0) {
    await queryInterface.addIndex(
      "salary_benchmarks",
      ["position", "league", "season"],
      {
        name: "idx_salary_benchmarks_position_league",
      },
    );
  }

  // Add a unique constraint so upsert by (position, tier, league, player_type, season) is deterministic
  const [uqRows] = await (queryInterface.sequelize as any).query(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'uq_salary_benchmarks_key'`,
  );
  if ((uqRows as any[]).length === 0) {
    await queryInterface.addIndex(
      "salary_benchmarks",
      ["position", "tier", "league", "player_type"],
      {
        name: "uq_salary_benchmarks_key",
        unique: true,
        where: "season IS NULL",
      },
    );
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("salary_benchmarks");
}
