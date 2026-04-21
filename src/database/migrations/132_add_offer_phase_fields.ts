import { QueryInterface } from "sequelize";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;

  await sq.query(
    `ALTER TABLE offers ADD COLUMN IF NOT EXISTS phase VARCHAR(20);`,
  );
  await sq.query(`
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS window_id UUID
      REFERENCES transfer_windows(id) ON DELETE SET NULL;
  `);
  await sq.query(
    `ALTER TABLE offers ADD COLUMN IF NOT EXISTS saff_reg_date DATE;`,
  );
  await sq.query(
    `ALTER TABLE offers ADD COLUMN IF NOT EXISTS itc_filed_date DATE;`,
  );
  await sq.query(
    `ALTER TABLE offers ADD COLUMN IF NOT EXISTS medical_date DATE;`,
  );
  await sq.query(
    `ALTER TABLE offers ADD COLUMN IF NOT EXISTS hot_signed_date DATE;`,
  );
  await sq.query(
    `ALTER TABLE offers ADD COLUMN IF NOT EXISTS blocker_notes TEXT;`,
  );

  await sq.query(`CREATE INDEX IF NOT EXISTS offers_phase ON offers (phase);`);
  await sq.query(
    `CREATE INDEX IF NOT EXISTS offers_window_id ON offers (window_id);`,
  );
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  const sq = queryInterface.sequelize;
  await sq.query(`DROP INDEX IF EXISTS offers_window_id;`);
  await sq.query(`DROP INDEX IF EXISTS offers_phase;`);
  await queryInterface.removeColumn("offers", "blocker_notes");
  await queryInterface.removeColumn("offers", "hot_signed_date");
  await queryInterface.removeColumn("offers", "medical_date");
  await queryInterface.removeColumn("offers", "itc_filed_date");
  await queryInterface.removeColumn("offers", "saff_reg_date");
  await queryInterface.removeColumn("offers", "window_id");
  await queryInterface.removeColumn("offers", "phase");
}
