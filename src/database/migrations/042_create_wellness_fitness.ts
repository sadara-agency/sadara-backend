// ═══════════════════════════════════════════════════════════════
// Migration 042: Create wellness fitness tables
//
// Tables: wellness_exercises, wellness_workout_templates,
//         wellness_template_exercises, wellness_workout_assignments,
//         wellness_workout_logs, wellness_daily_summaries
// ═══════════════════════════════════════════════════════════════

import { sequelize } from "@config/database";

export async function up() {
  const tx = await sequelize.transaction();
  try {
    // ── wellness_exercises (exercise library) ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_exercises (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(255) NOT NULL,
        name_ar         VARCHAR(255),
        muscle_group    VARCHAR(50) NOT NULL
                          CHECK (muscle_group IN (
                            'chest','back','shoulders','biceps','triceps',
                            'forearms','core','quads','hamstrings','glutes',
                            'calves','full_body','cardio','other'
                          )),
        equipment       VARCHAR(50) DEFAULT 'none'
                          CHECK (equipment IN (
                            'barbell','dumbbell','cable','machine','bodyweight',
                            'kettlebell','band','cardio_machine','other','none'
                          )),
        video_url       VARCHAR(500),
        video_thumbnail VARCHAR(500),
        instructions    TEXT,
        instructions_ar TEXT,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_by      UUID NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      { transaction: tx },
    );

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_exercises_muscle_group
       ON wellness_exercises (muscle_group) WHERE is_active = true;`,
      { transaction: tx },
    );

    // ── wellness_workout_templates ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_workout_templates (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name             VARCHAR(255) NOT NULL,
        name_ar          VARCHAR(255),
        description      TEXT,
        category         VARCHAR(30) NOT NULL DEFAULT 'strength'
                           CHECK (category IN ('strength','hypertrophy','cardio','recovery','mixed')),
        estimated_minutes INTEGER,
        is_active        BOOLEAN NOT NULL DEFAULT true,
        created_by       UUID NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      { transaction: tx },
    );

    // ── wellness_template_exercises (ordered exercises in a template) ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_template_exercises (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id     UUID NOT NULL
                          REFERENCES wellness_workout_templates(id) ON DELETE CASCADE,
        exercise_id     UUID NOT NULL
                          REFERENCES wellness_exercises(id) ON DELETE CASCADE,
        order_index     INTEGER NOT NULL DEFAULT 0,
        target_sets     INTEGER NOT NULL DEFAULT 3,
        target_reps     VARCHAR(20) NOT NULL DEFAULT '8-12',
        target_weight_kg DECIMAL(6,1),
        rest_seconds    INTEGER DEFAULT 90,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      { transaction: tx },
    );

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_template_exercises_template
       ON wellness_template_exercises (template_id, order_index);`,
      { transaction: tx },
    );

    // ── wellness_workout_assignments ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_workout_assignments (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id       UUID NOT NULL
                          REFERENCES players(id) ON DELETE CASCADE,
        template_id     UUID NOT NULL
                          REFERENCES wellness_workout_templates(id) ON DELETE CASCADE,
        assigned_date   DATE NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','in_progress','completed','skipped')),
        completed_at    TIMESTAMPTZ,
        assigned_by     UUID NOT NULL,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      { transaction: tx },
    );

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_assignments_player_date
       ON wellness_workout_assignments (player_id, assigned_date);
       CREATE INDEX IF NOT EXISTS idx_wellness_assignments_status
       ON wellness_workout_assignments (player_id, status) WHERE status IN ('pending','in_progress');`,
      { transaction: tx },
    );

    // ── wellness_workout_logs (actual performance per set) ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_workout_logs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id   UUID NOT NULL
                          REFERENCES wellness_workout_assignments(id) ON DELETE CASCADE,
        exercise_id     UUID NOT NULL
                          REFERENCES wellness_exercises(id) ON DELETE CASCADE,
        set_number      INTEGER NOT NULL,
        actual_reps     INTEGER,
        actual_weight_kg DECIMAL(6,1),
        rpe             DECIMAL(3,1) CHECK (rpe >= 1 AND rpe <= 10),
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
      { transaction: tx },
    );

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_workout_logs_assignment
       ON wellness_workout_logs (assignment_id, exercise_id, set_number);`,
      { transaction: tx },
    );

    // ── wellness_daily_summaries (denormalized for dashboard) ──
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS wellness_daily_summaries (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id             UUID NOT NULL
                                REFERENCES players(id) ON DELETE CASCADE,
        summary_date          DATE NOT NULL,
        total_calories        DECIMAL(8,1) DEFAULT 0,
        total_protein_g       DECIMAL(8,1) DEFAULT 0,
        total_carbs_g         DECIMAL(8,1) DEFAULT 0,
        total_fat_g           DECIMAL(8,1) DEFAULT 0,
        calorie_adherence_pct INTEGER,
        protein_adherence_pct INTEGER,
        workout_completed     BOOLEAN NOT NULL DEFAULT false,
        weight_logged         BOOLEAN NOT NULL DEFAULT false,
        ring_score            INTEGER DEFAULT 0 CHECK (ring_score >= 0 AND ring_score <= 100),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (player_id, summary_date)
      );`,
      { transaction: tx },
    );

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_wellness_daily_summaries_player_date
       ON wellness_daily_summaries (player_id, summary_date DESC);`,
      { transaction: tx },
    );

    await tx.commit();
    console.log("Migration 042: Wellness fitness tables created");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down() {
  const tx = await sequelize.transaction();
  try {
    await sequelize.query(
      `DROP TABLE IF EXISTS wellness_daily_summaries;
       DROP TABLE IF EXISTS wellness_workout_logs;
       DROP TABLE IF EXISTS wellness_workout_assignments;
       DROP TABLE IF EXISTS wellness_template_exercises;
       DROP TABLE IF EXISTS wellness_workout_templates;
       DROP TABLE IF EXISTS wellness_exercises;`,
      { transaction: tx },
    );
    await tx.commit();
    console.log("Migration 042: Wellness fitness tables dropped");
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
