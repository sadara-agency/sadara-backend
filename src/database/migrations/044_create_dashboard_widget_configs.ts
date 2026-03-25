import { sequelize } from "@config/database";

export async function up() {
  // Ensure uuid generation is available
  await sequelize.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS dashboard_widget_configs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role        VARCHAR(50)  NOT NULL,
      widget_key  VARCHAR(100) NOT NULL,
      position    INTEGER      NOT NULL DEFAULT 0,
      size        VARCHAR(20)  DEFAULT 'normal',
      enabled     BOOLEAN      NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW(),
      CONSTRAINT uq_dwc_role_widget UNIQUE (role, widget_key)
    );
  `);

  // If Sequelize model.sync() created the table first without DB defaults, fix them
  await sequelize.query(`
    ALTER TABLE dashboard_widget_configs
      ALTER COLUMN id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();
  `);

  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_dwc_role ON dashboard_widget_configs(role)`,
  );

  // Seed default widget layouts per role group
  // Management: Admin, Manager, Executive — all widgets
  // Operations: Scout, Coach, GymCoach — player-centric
  // Back-Office: Legal, Finance, Media, Analyst — domain-filtered

  const managementWidgets = [
    "hero",
    "kpi_strip",
    "revenue_tasks_row",
    "analytics_row",
    "contract_players_row",
    "recent_offers_row",
    "player_intel_row",
    "activity_feed_row",
  ];

  const operationsWidgets = [
    "hero",
    "kpi_strip",
    "analytics_row",
    "contract_players_row",
    "player_intel_row",
  ];

  const backofficeWidgets = [
    "hero",
    "kpi_strip",
    "revenue_tasks_row",
    "analytics_row",
    "contract_players_row",
    "recent_offers_row",
    "activity_feed_row",
  ];

  const groups: Record<string, string[]> = {
    Admin: managementWidgets,
    Manager: managementWidgets,
    Executive: managementWidgets,
    Scout: operationsWidgets,
    Coach: operationsWidgets,
    GymCoach: operationsWidgets,
    Legal: backofficeWidgets,
    Finance: backofficeWidgets,
    Media: backofficeWidgets,
    Analyst: backofficeWidgets,
  };

  const values: string[] = [];
  for (const [role, widgets] of Object.entries(groups)) {
    widgets.forEach((widget, idx) => {
      values.push(`('${role}', '${widget}', ${idx}, 'normal', true)`);
    });
  }

  if (values.length > 0) {
    await sequelize.query(`
      INSERT INTO dashboard_widget_configs (role, widget_key, position, size, enabled)
      VALUES ${values.join(",\n")}
      ON CONFLICT (role, widget_key) DO NOTHING;
    `);
  }
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS dashboard_widget_configs;`);
}
