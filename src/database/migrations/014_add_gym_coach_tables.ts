import { sequelize } from "@config/database";

export async function up() {
  await sequelize.query(`
    -- ══════════════════════════════════════════
    -- Exercise Library (master catalog)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS exercise_library (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200),
      muscle_group VARCHAR(50) NOT NULL,
      secondary_muscles TEXT,
      equipment VARCHAR(50),
      movement_type VARCHAR(50),
      difficulty VARCHAR(20) DEFAULT 'Intermediate',
      media_url VARCHAR(500),
      instructions TEXT,
      instructions_ar TEXT,
      is_custom BOOLEAN DEFAULT false,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_exercise_library_muscle ON exercise_library(muscle_group);
    CREATE INDEX IF NOT EXISTS idx_exercise_library_equipment ON exercise_library(equipment);

    -- ══════════════════════════════════════════
    -- Body Metrics (player measurements)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS body_metrics (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      weight DECIMAL(5,2),
      height DECIMAL(5,2),
      body_fat_pct DECIMAL(4,1),
      muscle_mass DECIMAL(5,2),
      bmi DECIMAL(4,1),
      chest DECIMAL(5,1),
      waist DECIMAL(5,1),
      arms DECIMAL(5,1),
      thighs DECIMAL(5,1),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_body_metrics_player ON body_metrics(player_id);
    CREATE INDEX IF NOT EXISTS idx_body_metrics_date ON body_metrics(player_id, date);

    -- ══════════════════════════════════════════
    -- Metric Targets
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS metric_targets (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      set_by UUID REFERENCES users(id) ON DELETE SET NULL,
      target_weight DECIMAL(5,2),
      target_body_fat DECIMAL(4,1),
      target_muscle_mass DECIMAL(5,2),
      deadline DATE,
      status VARCHAR(20) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_metric_targets_active UNIQUE (player_id, status)
    );
    CREATE INDEX IF NOT EXISTS idx_metric_targets_player ON metric_targets(player_id);

    -- ══════════════════════════════════════════
    -- BMR Calculations (saved)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS bmr_calculations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      calculated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      weight DECIMAL(5,2) NOT NULL,
      height DECIMAL(5,2) NOT NULL,
      age INT NOT NULL,
      gender VARCHAR(10) NOT NULL DEFAULT 'male',
      activity_level VARCHAR(20) NOT NULL DEFAULT 'moderate',
      bmr DECIMAL(7,1) NOT NULL,
      tdee DECIMAL(7,1) NOT NULL,
      goal VARCHAR(20) NOT NULL DEFAULT 'maintain',
      target_calories DECIMAL(7,1),
      protein_g DECIMAL(5,1),
      carbs_g DECIMAL(5,1),
      fat_g DECIMAL(5,1),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bmr_calculations_player ON bmr_calculations(player_id);

    -- ══════════════════════════════════════════
    -- Workout Plans
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS workout_plans (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200),
      description TEXT,
      description_ar TEXT,
      duration_weeks INT DEFAULT 4,
      days_per_week INT DEFAULT 5,
      type VARCHAR(20) DEFAULT 'individual',
      status VARCHAR(20) DEFAULT 'draft',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- ══════════════════════════════════════════
    -- Workout Sessions (day containers within a plan)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
      week_number INT NOT NULL DEFAULT 1,
      day_number INT NOT NULL DEFAULT 1,
      session_name VARCHAR(200),
      session_name_ar VARCHAR(200),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan ON workout_sessions(plan_id);

    -- ══════════════════════════════════════════
    -- Workout Exercises (exercise instances in a session)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      exercise_id UUID REFERENCES exercise_library(id) ON DELETE SET NULL,
      custom_name VARCHAR(200),
      sets INT DEFAULT 3,
      reps VARCHAR(20) DEFAULT '10',
      weight DECIMAL(5,1),
      rest_seconds INT DEFAULT 60,
      tempo VARCHAR(20),
      sort_order INT DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_session ON workout_exercises(session_id);

    -- ══════════════════════════════════════════
    -- Workout Assignments (plan → player link)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS workout_assignments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
      start_date DATE DEFAULT CURRENT_DATE,
      end_date DATE,
      status VARCHAR(20) DEFAULT 'active',
      completion_pct INT DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_workout_assignment UNIQUE (plan_id, player_id)
    );
    CREATE INDEX IF NOT EXISTS idx_workout_assignments_player ON workout_assignments(player_id);
    CREATE INDEX IF NOT EXISTS idx_workout_assignments_plan ON workout_assignments(plan_id);

    -- ══════════════════════════════════════════
    -- Workout Logs (player session completions)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS workout_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      assignment_id UUID NOT NULL REFERENCES workout_assignments(id) ON DELETE CASCADE,
      session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      actual_data JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_workout_logs_assignment ON workout_logs(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_workout_logs_player ON workout_logs(player_id);

    -- ══════════════════════════════════════════
    -- Food Database (master food catalog)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS food_database (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200),
      category VARCHAR(50),
      calories_per_100g DECIMAL(6,1),
      protein_per_100g DECIMAL(5,1),
      carbs_per_100g DECIMAL(5,1),
      fat_per_100g DECIMAL(5,1),
      fiber_per_100g DECIMAL(5,1),
      serving_size DECIMAL(6,1) DEFAULT 100,
      serving_unit VARCHAR(20) DEFAULT 'g',
      is_custom BOOLEAN DEFAULT false,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_food_database_category ON food_database(category);

    -- ══════════════════════════════════════════
    -- Diet Plans
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS diet_plans (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name_en VARCHAR(200) NOT NULL,
      name_ar VARCHAR(200),
      description TEXT,
      description_ar TEXT,
      type VARCHAR(20) DEFAULT 'weekly',
      target_calories DECIMAL(7,1),
      target_protein DECIMAL(5,1),
      target_carbs DECIMAL(5,1),
      target_fat DECIMAL(5,1),
      status VARCHAR(20) DEFAULT 'draft',
      is_template BOOLEAN DEFAULT false,
      template_tags TEXT[],
      player_id UUID REFERENCES players(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_diet_plans_player ON diet_plans(player_id);

    -- ══════════════════════════════════════════
    -- Diet Meals (meals within a plan day)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS diet_meals (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
      day_number INT DEFAULT 1,
      meal_type VARCHAR(20) NOT NULL DEFAULT 'lunch',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_diet_meals_plan ON diet_meals(plan_id);

    -- ══════════════════════════════════════════
    -- Diet Meal Items (food items within a meal)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS diet_meal_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      meal_id UUID NOT NULL REFERENCES diet_meals(id) ON DELETE CASCADE,
      food_id UUID REFERENCES food_database(id) ON DELETE SET NULL,
      custom_name VARCHAR(200),
      serving_size DECIMAL(6,1) DEFAULT 100,
      serving_unit VARCHAR(20) DEFAULT 'g',
      calories DECIMAL(6,1),
      protein DECIMAL(5,1),
      carbs DECIMAL(5,1),
      fat DECIMAL(5,1),
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_diet_meal_items_meal ON diet_meal_items(meal_id);

    -- ══════════════════════════════════════════
    -- Diet Adherence (player meal logging)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS diet_adherence (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
      player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      meal_id UUID REFERENCES diet_meals(id) ON DELETE SET NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      status VARCHAR(20) DEFAULT 'consumed',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_diet_adherence_player ON diet_adherence(player_id);
    CREATE INDEX IF NOT EXISTS idx_diet_adherence_plan ON diet_adherence(plan_id, date);

    -- ══════════════════════════════════════════
    -- Coach Alerts (configurable alert rules)
    -- ══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS coach_alerts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      player_id UUID REFERENCES players(id) ON DELETE CASCADE,
      alert_type VARCHAR(30) NOT NULL,
      threshold DECIMAL(6,1),
      message TEXT,
      is_read BOOLEAN DEFAULT false,
      triggered_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_coach_alerts_coach ON coach_alerts(coach_id);
    CREATE INDEX IF NOT EXISTS idx_coach_alerts_player ON coach_alerts(player_id);
  `);
}

export async function down() {
  await sequelize.query(`
    DROP TABLE IF EXISTS coach_alerts CASCADE;
    DROP TABLE IF EXISTS diet_adherence CASCADE;
    DROP TABLE IF EXISTS diet_meal_items CASCADE;
    DROP TABLE IF EXISTS diet_meals CASCADE;
    DROP TABLE IF EXISTS diet_plans CASCADE;
    DROP TABLE IF EXISTS food_database CASCADE;
    DROP TABLE IF EXISTS workout_logs CASCADE;
    DROP TABLE IF EXISTS workout_assignments CASCADE;
    DROP TABLE IF EXISTS workout_exercises CASCADE;
    DROP TABLE IF EXISTS workout_sessions CASCADE;
    DROP TABLE IF EXISTS workout_plans CASCADE;
    DROP TABLE IF EXISTS bmr_calculations CASCADE;
    DROP TABLE IF EXISTS metric_targets CASCADE;
    DROP TABLE IF EXISTS body_metrics CASCADE;
    DROP TABLE IF EXISTS exercise_library CASCADE;
  `);
}
