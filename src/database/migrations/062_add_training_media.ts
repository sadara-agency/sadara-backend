import { sequelize } from "@config/database";

/**
 * Migration 062: Create training_media table for native video hosting
 *
 * Replaces external URL dependencies with direct GCS-hosted media.
 * Supports video, PDF, and document types with metadata tracking.
 */

export async function up() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS training_media (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id        UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
      type             VARCHAR(20) NOT NULL DEFAULT 'video',
      title            VARCHAR(500),
      title_ar         VARCHAR(500),
      storage_provider VARCHAR(10) NOT NULL DEFAULT 'gcs',
      storage_path     TEXT,
      external_url     TEXT,
      duration_sec     INTEGER,
      file_size_mb     DECIMAL(10,2),
      mime_type        VARCHAR(100),
      thumbnail_path   TEXT,
      encoding_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_by       UUID REFERENCES users(id),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_training_media_course ON training_media(course_id);
  `);

  // Add new activity actions for video progress tracking
  await sequelize.query(
    `ALTER TYPE "enum_training_activities_action" ADD VALUE IF NOT EXISTS 'VideoPaused'`,
  );
  await sequelize.query(
    `ALTER TYPE "enum_training_activities_action" ADD VALUE IF NOT EXISTS 'VideoProgress'`,
  );
  await sequelize.query(
    `ALTER TYPE "enum_training_activities_action" ADD VALUE IF NOT EXISTS 'VideoResumed'`,
  );
}

export async function down() {
  await sequelize.query(`DROP TABLE IF EXISTS training_media`);
}
