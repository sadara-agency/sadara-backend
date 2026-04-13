import { QueryInterface, DataTypes } from "sequelize";

/**
 * Adds a timezone column to calendar_events so that recurring-event rrule
 * expansion (done client-side) and reminder scheduling use the event creator's
 * local timezone rather than the server's UTC clock.
 *
 * Default is 'Asia/Riyadh' (the platform's primary timezone for MENA users).
 * Values must be valid IANA timezone identifiers (e.g. 'Asia/Dubai', 'Europe/London').
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn("calendar_events", "timezone", {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: "Asia/Riyadh",
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn("calendar_events", "timezone");
}
