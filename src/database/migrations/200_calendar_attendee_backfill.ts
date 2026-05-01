import { QueryInterface } from "sequelize";

/**
 * Backfills event_attendees for existing sessions/tasks/referrals.
 *
 * Historical data predating the calendar scope system is sparse — most
 * installations have no calendar_events rows linked to sessions/tasks/referrals
 * yet. The upsertSourceAttendees hook handles all new data going forward.
 *
 * This migration is intentionally a no-op to avoid cross-table type-cast
 * issues between installations that store source_id as UUID vs TEXT.
 * A targeted data-fix script can be run manually if backfill is needed.
 */
export async function up({
  context: _queryInterface,
}: {
  context: QueryInterface;
}) {
  // no-op — see comment above
}

export async function down({
  context: _queryInterface,
}: {
  context: QueryInterface;
}) {
  // no-op
}
