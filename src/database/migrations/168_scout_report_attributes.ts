import { QueryInterface, DataTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const [tableRows] = await (queryInterface.sequelize as any).query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scout_report_attributes'`,
  );
  if ((tableRows as any[]).length > 0) return;

  await queryInterface.createTable("scout_report_attributes", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    watchlist_id: { type: DataTypes.UUID, allowNull: false },
    authored_by: { type: DataTypes.UUID, allowNull: true },

    // Physical (1-10)
    pace: { type: DataTypes.INTEGER, allowNull: true },
    strength: { type: DataTypes.INTEGER, allowNull: true },
    stamina: { type: DataTypes.INTEGER, allowNull: true },

    // Technical (1-10)
    ball_control: { type: DataTypes.INTEGER, allowNull: true },
    passing: { type: DataTypes.INTEGER, allowNull: true },
    shooting: { type: DataTypes.INTEGER, allowNull: true },
    defending: { type: DataTypes.INTEGER, allowNull: true },

    // Mental (1-10)
    decision_making: { type: DataTypes.INTEGER, allowNull: true },
    leadership: { type: DataTypes.INTEGER, allowNull: true },
    work_rate: { type: DataTypes.INTEGER, allowNull: true },

    // Tactical (1-10)
    positioning: { type: DataTypes.INTEGER, allowNull: true },
    pressing_score: { type: DataTypes.INTEGER, allowNull: true },
    tactical_awareness: { type: DataTypes.INTEGER, allowNull: true },

    overall_score: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    recommendation: { type: DataTypes.STRING(20), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    notes_ar: { type: DataTypes.TEXT, allowNull: true },

    similar_watchlist_ids: { type: DataTypes.JSONB, allowNull: true },

    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  const [indexRows] = await (queryInterface.sequelize as any).query(
    `SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scout_reports_watchlist'`,
  );
  if ((indexRows as any[]).length === 0) {
    await queryInterface.addIndex("scout_report_attributes", ["watchlist_id"], {
      name: "idx_scout_reports_watchlist",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("scout_report_attributes");
}
