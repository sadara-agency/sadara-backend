import { sequelize } from "@config/database";

/**
 * Migration 093: Auto-wrap existing flat courses (those with content_url
 * but no modules yet) into a default module + lesson structure so they
 * appear correctly in the new hierarchical UI.
 *
 * Idempotent — uses NOT EXISTS to skip courses that already have modules.
 */
export async function up() {
  // Create a default module for each flat course that has content
  await sequelize.query(`
    INSERT INTO training_modules (id, course_id, title, title_ar, sort_order)
    SELECT gen_random_uuid(), tc.id, tc.title, tc.title_ar, 0
    FROM training_courses tc
    WHERE tc.content_url IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM training_modules tm WHERE tm.course_id = tc.id
      );
  `);

  // Create a lesson inside each newly created module
  await sequelize.query(`
    INSERT INTO training_lessons (id, module_id, title, title_ar, type, sort_order, content_url)
    SELECT
      gen_random_uuid(),
      tm.id,
      tc.title,
      tc.title_ar,
      CASE
        WHEN tc.content_type = 'Video' THEN 'video'
        WHEN tc.content_type = 'PDF' THEN 'pdf'
        WHEN tc.content_type = 'Link' THEN 'link'
        WHEN tc.content_type = 'Exercise' THEN 'link'
        ELSE 'video'
      END,
      0,
      tc.content_url
    FROM training_courses tc
    JOIN training_modules tm ON tm.course_id = tc.id
    WHERE tc.content_url IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM training_lessons tl WHERE tl.module_id = tm.id
      );
  `);
}

export async function down() {
  // No rollback — data migration is additive and harmless
}
