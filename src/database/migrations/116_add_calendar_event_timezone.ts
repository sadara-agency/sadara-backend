import { QueryInterface, DataTypes } from "sequelize";

/**
 * Adds a timezone column to calendar_events so that recurring-event rrule
 * expansion (done client-side) and reminder scheduling use the event creator's
 * local timezone rather than the server's UTC clock.
 *
 * Default is 'Asia/Riyadh' (the platform's primary timezone for MENA users).
 * Values must be valid IANA timezone identifiers (e.g. 'Asia/Dubai', 'Europe/London').
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  const table = (await queryInterface.describeTable(
    "calendar_events",
  )) as Record<string, unknown>;
  if (!table.timezone) {
    await queryInterface.addColumn("calendar_events", "timezone", {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "Asia/Riyadh",
    });
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public'`,
  );
  if ((rows as unknown[]).length === 0) return;
  const table = (await queryInterface.describeTable(
    "calendar_events",
  )) as Record<string, unknown>;
  if (table.timezone) {
    await queryInterface.removeColumn("calendar_events", "timezone");
  }
}
