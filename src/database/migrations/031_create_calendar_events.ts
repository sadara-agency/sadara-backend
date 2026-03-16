import { sequelize } from "@config/database";

export async function up() {
  // ── Table: calendar_events ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title                 VARCHAR(500) NOT NULL,
      title_ar              VARCHAR(500),
      description           TEXT,
      description_ar        TEXT,
      event_type            VARCHAR(50) NOT NULL DEFAULT 'Custom',
      start_date            TIMESTAMPTZ NOT NULL,
      end_date              TIMESTAMPTZ NOT NULL,
      all_day               BOOLEAN NOT NULL DEFAULT false,
      location              VARCHAR(500),
      location_ar           VARCHAR(500),
      color                 VARCHAR(20),
      recurrence_rule       VARCHAR(255),
      recurrence_parent_id  UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
      recurrence_exception  BOOLEAN NOT NULL DEFAULT false,
      source_type           VARCHAR(50),
      source_id             UUID,
      is_auto_created       BOOLEAN NOT NULL DEFAULT false,
      reminder_minutes      INTEGER,
      created_by            UUID NOT NULL,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cal_events_dates
      ON calendar_events(start_date, end_date);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cal_events_type
      ON calendar_events(event_type);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cal_events_created_by
      ON calendar_events(created_by);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cal_events_source
      ON calendar_events(source_type, source_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_cal_events_parent
      ON calendar_events(recurrence_parent_id);
  `);

  // ── Table: event_attendees ──
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS event_attendees (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id        UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
      attendee_type   VARCHAR(20) NOT NULL,
      attendee_id     UUID NOT NULL,
      status          VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_event_attendee UNIQUE (event_id, attendee_type, attendee_id)
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_event_attendees_event
      ON event_attendees(event_id);
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_event_attendees_attendee
      ON event_attendees(attendee_type, attendee_id);
  `);
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS event_attendees CASCADE`);
  await sequelize.query(`DROP TABLE IF EXISTS calendar_events CASCADE`);
}
