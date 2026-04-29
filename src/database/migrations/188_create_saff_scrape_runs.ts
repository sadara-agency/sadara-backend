import { QueryInterface, DataTypes } from "sequelize";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (await tableExists(queryInterface, "saff_scrape_runs")) return;

  await queryInterface.createTable("saff_scrape_runs", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "saff | saffplus",
    },
    saff_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "SAFF championship ID — null for list-scrape runs",
    },
    season: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    target_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    trigger_source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "cron:Critical | admin | api | wizard",
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
      comment: "pending | success | failed | skipped | sanity_fail",
    },
    http_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rows_standings: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rows_fixtures: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rows_teams: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    scraper_version: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment:
        "SELECTOR_VERSION at scrape time — correlate with selector changes",
    },
    validation_warnings: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    `CREATE INDEX IF NOT EXISTS idx_saff_scrape_runs_tournament ON saff_scrape_runs (saff_id, season)`,
  );
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_saff_scrape_runs_started_at ON saff_scrape_runs (started_at)`,
  );
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_saff_scrape_runs_status ON saff_scrape_runs (status)`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  await queryInterface.dropTable("saff_scrape_runs");
}
