import { QueryInterface } from "sequelize";

/**
 * Create `medical_reports` + `medical_lab_results` tables.
 *
 * A MedicalReport is a structured layer on top of an existing `documents` row
 * (the PDF blob). Each report can have many lab_result rows (individual tests
 * like CK, Cortisol, etc.) parsed from the PDF or entered manually by an admin.
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [r] = await queryInterface.sequelize.query(
    `SELECT to_regclass('public.players') AS tbl`,
  );
  if (!(r as Array<{ tbl: string | null }>)[0]?.tbl) return;

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS medical_reports (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      player_id       UUID        NOT NULL REFERENCES players(id)   ON DELETE CASCADE,
      document_id     UUID        NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
      provider        VARCHAR(200),
      report_type     VARCHAR(100),
      report_date     DATE,
      collected_date  DATE,
      reservation_id  VARCHAR(100),
      parse_status    VARCHAR(20) NOT NULL DEFAULT 'pending',
      summary_notes   TEXT,
      uploaded_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_medical_reports_player_date
    ON medical_reports (player_id, report_date DESC NULLS LAST);
  `);

  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS medical_lab_results (
      id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      medical_report_id  UUID        NOT NULL REFERENCES medical_reports(id) ON DELETE CASCADE,
      category           VARCHAR(100),
      name               VARCHAR(300) NOT NULL,
      value_numeric      DECIMAL(20,6),
      value_text         VARCHAR(200),
      unit               VARCHAR(50),
      flag               VARCHAR(5),
      ref_range_low      DECIMAL(20,6),
      ref_range_high     DECIMAL(20,6),
      ref_range_text     TEXT,
      comment            TEXT,
      sort_order         INTEGER     NOT NULL DEFAULT 0,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_medical_lab_results_report_order
    ON medical_lab_results (medical_report_id, sort_order);
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(
    `DROP TABLE IF EXISTS medical_lab_results;`,
  );
  await queryInterface.sequelize.query(`DROP TABLE IF EXISTS medical_reports;`);
}
