import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

/**
 * Backfills event_attendees rows for existing sessions, tasks, and referrals
 * so they participate in the new calendar visibility model without re-querying
 * each source table every time.
 *
 * All INSERTs use ON CONFLICT DO NOTHING — safe to re-run.
 * All UUID comparisons cast both sides to ::text to avoid uuid = text type errors
 * when the attendee_id column is stored as VARCHAR rather than native UUID.
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "event_attendees"))) return;

  // Sessions: backfill responsible user + player
  if (await tableExists(queryInterface, "sessions")) {
    await queryInterface.sequelize.query(`
      INSERT INTO event_attendees (id, event_id, attendee_type, attendee_id, status, created_at)
      SELECT
        gen_random_uuid(),
        ce.id,
        'user',
        s.responsible_id::text,
        'accepted',
        NOW()
      FROM sessions s
      JOIN calendar_events ce
        ON ce.source_type = 'session' AND ce.source_id = s.id::text
      WHERE s.responsible_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM event_attendees ea
          WHERE ea.event_id = ce.id
            AND ea.attendee_type = 'user'
            AND ea.attendee_id::text = s.responsible_id::text
        )
      ON CONFLICT DO NOTHING
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO event_attendees (id, event_id, attendee_type, attendee_id, status, created_at)
      SELECT
        gen_random_uuid(),
        ce.id,
        'player',
        s.player_id::text,
        'accepted',
        NOW()
      FROM sessions s
      JOIN calendar_events ce
        ON ce.source_type = 'session' AND ce.source_id = s.id::text
      WHERE s.player_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM event_attendees ea
          WHERE ea.event_id = ce.id
            AND ea.attendee_type = 'player'
            AND ea.attendee_id::text = s.player_id::text
        )
      ON CONFLICT DO NOTHING
    `);
  }

  // Tasks: backfill assignedTo user on calendar_events linked to tasks
  if (await tableExists(queryInterface, "tasks")) {
    await queryInterface.sequelize.query(`
      INSERT INTO event_attendees (id, event_id, attendee_type, attendee_id, status, created_at)
      SELECT
        gen_random_uuid(),
        ce.id,
        'user',
        t.assigned_to::text,
        'accepted',
        NOW()
      FROM tasks t
      JOIN calendar_events ce
        ON ce.source_type = 'task' AND ce.source_id = t.id::text
      WHERE t.assigned_to IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM event_attendees ea
          WHERE ea.event_id = ce.id
            AND ea.attendee_type = 'user'
            AND ea.attendee_id::text = t.assigned_to::text
        )
      ON CONFLICT DO NOTHING
    `);
  }

  // Referrals: backfill assignedTo user on calendar_events linked to referrals
  if (await tableExists(queryInterface, "referrals")) {
    await queryInterface.sequelize.query(`
      INSERT INTO event_attendees (id, event_id, attendee_type, attendee_id, status, created_at)
      SELECT
        gen_random_uuid(),
        ce.id,
        'user',
        r.assigned_to::text,
        'accepted',
        NOW()
      FROM referrals r
      JOIN calendar_events ce
        ON ce.source_type = 'referral' AND ce.source_id = r.id::text
      WHERE r.assigned_to IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM event_attendees ea
          WHERE ea.event_id = ce.id
            AND ea.attendee_type = 'user'
            AND ea.attendee_id::text = r.assigned_to::text
        )
      ON CONFLICT DO NOTHING
    `);
  }
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "event_attendees"))) return;

  await queryInterface.sequelize.query(`
    DELETE FROM event_attendees ea
    WHERE EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = ea.event_id
        AND ce.source_type IN ('session', 'task', 'referral')
    )
  `);
}
