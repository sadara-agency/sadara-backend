import { QueryInterface, DataTypes, QueryTypes } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.createTable("performances", {
    id: {
      type: `UUID DEFAULT gen_random_uuid()` as unknown as DataTypes.DataType,
      primaryKey: true,
      allowNull: false,
    },
    player_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    average_rating: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true,
    },
    goals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    assists: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    key_passes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    successful_dribbles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 90,
    },
    created_at: {
      type: `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` as unknown as DataTypes.DataType,
      allowNull: false,
    },
    updated_at: {
      type: `TIMESTAMP WITH TIME ZONE DEFAULT NOW()` as unknown as DataTypes.DataType,
      allowNull: false,
    },
  });

  const sequelize = queryInterface.sequelize;

  // migration-lint: disable-next-line
  const [playerIdxExists] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = 'performances' AND indexdef LIKE '%player_id%' AND indexname NOT LIKE '%unique%'`,
    { type: QueryTypes.SELECT },
  );
  // migration-lint: disable-next-line
  const [matchIdxExists] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = 'performances' AND indexdef LIKE '%match_id%' AND indexname NOT LIKE '%unique%' AND indexname NOT LIKE '%player%'`,
    { type: QueryTypes.SELECT },
  );
  // migration-lint: disable-next-line
  const [uniqueIdxExists] = await sequelize.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = 'performances' AND indexname = 'performances_player_match_unique'`,
    { type: QueryTypes.SELECT },
  );

  if (!playerIdxExists) {
    // migration-lint: disable-next-line
    await queryInterface.addIndex("performances", ["player_id"]);
  }
  if (!matchIdxExists) {
    // migration-lint: disable-next-line
    await queryInterface.addIndex("performances", ["match_id"]);
  }
  if (!uniqueIdxExists) {
    // migration-lint: disable-next-line
    await queryInterface.addIndex("performances", ["player_id", "match_id"], {
      name: "performances_player_match_unique",
      unique: true,
    });
  }

  // Add FK constraints only if parent tables exist (fresh-DB guard)
  // migration-lint: disable-next-line
  const [playersExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'players' AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  // migration-lint: disable-next-line
  const [playerFkExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'performances_player_id_fkey' AND table_name = 'performances'`,
    { type: QueryTypes.SELECT },
  );
  if (playersExists && !playerFkExists) {
    await queryInterface.addConstraint("performances", {
      fields: ["player_id"],
      type: "foreign key",
      name: "performances_player_id_fkey",
      references: { table: "players", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }

  // migration-lint: disable-next-line
  const [matchesExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'matches' AND table_schema = 'public'`,
    { type: QueryTypes.SELECT },
  );
  // migration-lint: disable-next-line
  const [matchFkExists] = await sequelize.query(
    `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'performances_match_id_fkey' AND table_name = 'performances'`,
    { type: QueryTypes.SELECT },
  );
  if (matchesExists && !matchFkExists) {
    await queryInterface.addConstraint("performances", {
      fields: ["match_id"],
      type: "foreign key",
      name: "performances_match_id_fkey",
      references: { table: "matches", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("performances");
}
