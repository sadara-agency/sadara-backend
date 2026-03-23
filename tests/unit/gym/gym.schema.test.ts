import {
  createExerciseSchema,
  updateExerciseSchema,
  createBodyMetricSchema,
  createMetricTargetSchema,
  calculateBmrSchema,
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  createSessionSchema,
  createWorkoutExerciseSchema,
  assignWorkoutSchema,
  logWorkoutSchema,
  createFoodSchema,
  createDietPlanSchema,
  updateDietPlanSchema,
  createDietMealSchema,
  logAdherenceSchema,
} from '../../../src/modules/gym/gym.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Gym Schemas', () => {

  // ── Exercise Library ──

  describe('createExerciseSchema', () => {
    it('should accept valid exercise', () => {
      expect(createExerciseSchema.safeParse({ nameEn: 'Bench Press', muscleGroup: 'Chest' }).success).toBe(true);
    });

    it('should reject empty nameEn', () => {
      expect(createExerciseSchema.safeParse({ nameEn: '', muscleGroup: 'Chest' }).success).toBe(false);
    });

    it('should reject empty muscleGroup', () => {
      expect(createExerciseSchema.safeParse({ nameEn: 'Test', muscleGroup: '' }).success).toBe(false);
    });

    it('should default difficulty to Intermediate', () => {
      expect(createExerciseSchema.parse({ nameEn: 'Test', muscleGroup: 'Chest' }).difficulty).toBe('Intermediate');
    });

    it('should reject invalid difficulty', () => {
      expect(createExerciseSchema.safeParse({ nameEn: 'Test', muscleGroup: 'Chest', difficulty: 'Expert' }).success).toBe(false);
    });

    it('should reject invalid mediaUrl', () => {
      expect(createExerciseSchema.safeParse({ nameEn: 'Test', muscleGroup: 'Chest', mediaUrl: 'not-url' }).success).toBe(false);
    });
  });

  describe('updateExerciseSchema', () => {
    it('should accept partial data', () => {
      expect(updateExerciseSchema.safeParse({ nameEn: 'Updated' }).success).toBe(true);
    });

    it('should accept empty object', () => {
      expect(updateExerciseSchema.safeParse({}).success).toBe(true);
    });
  });

  // ── Body Metrics ──

  describe('createBodyMetricSchema', () => {
    it('should accept valid metric', () => {
      expect(createBodyMetricSchema.safeParse({ playerId: UUID, weight: 80 }).success).toBe(true);
    });

    it('should reject invalid playerId', () => {
      expect(createBodyMetricSchema.safeParse({ playerId: 'bad' }).success).toBe(false);
    });

    it('should reject negative weight', () => {
      expect(createBodyMetricSchema.safeParse({ playerId: UUID, weight: -1 }).success).toBe(false);
    });

    it('should reject bodyFatPct > 100', () => {
      expect(createBodyMetricSchema.safeParse({ playerId: UUID, bodyFatPct: 101 }).success).toBe(false);
    });
  });

  // ── Metric Targets ──

  describe('createMetricTargetSchema', () => {
    it('should accept valid target', () => {
      expect(createMetricTargetSchema.safeParse({ playerId: UUID, targetWeight: 75 }).success).toBe(true);
    });

    it('should reject invalid playerId', () => {
      expect(createMetricTargetSchema.safeParse({ playerId: 'bad' }).success).toBe(false);
    });
  });

  // ── BMR Calculator ──

  describe('calculateBmrSchema', () => {
    it('should accept valid input', () => {
      expect(calculateBmrSchema.safeParse({ playerId: UUID, weight: 80, height: 180, age: 25 }).success).toBe(true);
    });

    it('should default gender to male', () => {
      expect(calculateBmrSchema.parse({ playerId: UUID, weight: 80, height: 180, age: 25 }).gender).toBe('male');
    });

    it('should default activityLevel to moderate', () => {
      expect(calculateBmrSchema.parse({ playerId: UUID, weight: 80, height: 180, age: 25 }).activityLevel).toBe('moderate');
    });

    it('should default goal to maintain', () => {
      expect(calculateBmrSchema.parse({ playerId: UUID, weight: 80, height: 180, age: 25 }).goal).toBe('maintain');
    });

    it('should reject invalid gender', () => {
      expect(calculateBmrSchema.safeParse({ playerId: UUID, weight: 80, height: 180, age: 25, gender: 'other' }).success).toBe(false);
    });

    it('should reject negative weight', () => {
      expect(calculateBmrSchema.safeParse({ playerId: UUID, weight: -1, height: 180, age: 25 }).success).toBe(false);
    });
  });

  // ── Workout Plans ──

  describe('createWorkoutPlanSchema', () => {
    it('should accept valid plan', () => {
      expect(createWorkoutPlanSchema.safeParse({ nameEn: 'PPL' }).success).toBe(true);
    });

    it('should reject empty nameEn', () => {
      expect(createWorkoutPlanSchema.safeParse({ nameEn: '' }).success).toBe(false);
    });

    it('should default durationWeeks to 4', () => {
      expect(createWorkoutPlanSchema.parse({ nameEn: 'Test' }).durationWeeks).toBe(4);
    });

    it('should default daysPerWeek to 5', () => {
      expect(createWorkoutPlanSchema.parse({ nameEn: 'Test' }).daysPerWeek).toBe(5);
    });

    it('should default type to individual', () => {
      expect(createWorkoutPlanSchema.parse({ nameEn: 'Test' }).type).toBe('individual');
    });

    it('should reject daysPerWeek > 7', () => {
      expect(createWorkoutPlanSchema.safeParse({ nameEn: 'Test', daysPerWeek: 8 }).success).toBe(false);
    });

    it('should reject durationWeeks > 52', () => {
      expect(createWorkoutPlanSchema.safeParse({ nameEn: 'Test', durationWeeks: 53 }).success).toBe(false);
    });
  });

  describe('updateWorkoutPlanSchema', () => {
    it('should accept status change', () => {
      expect(updateWorkoutPlanSchema.safeParse({ status: 'archived' }).success).toBe(true);
    });

    it('should reject invalid status', () => {
      expect(updateWorkoutPlanSchema.safeParse({ status: 'deleted' }).success).toBe(false);
    });
  });

  // ── Sessions ──

  describe('createSessionSchema', () => {
    it('should accept valid session', () => {
      expect(createSessionSchema.safeParse({ weekNumber: 1, dayNumber: 3 }).success).toBe(true);
    });

    it('should reject dayNumber > 7', () => {
      expect(createSessionSchema.safeParse({ weekNumber: 1, dayNumber: 8 }).success).toBe(false);
    });

    it('should reject weekNumber < 1', () => {
      expect(createSessionSchema.safeParse({ weekNumber: 0, dayNumber: 1 }).success).toBe(false);
    });
  });

  // ── Workout Exercises ──

  describe('createWorkoutExerciseSchema', () => {
    it('should accept valid exercise entry', () => {
      expect(createWorkoutExerciseSchema.safeParse({ exerciseId: UUID, sets: 3, reps: '10' }).success).toBe(true);
    });

    it('should default sets to 3', () => {
      expect(createWorkoutExerciseSchema.parse({}).sets).toBe(3);
    });

    it('should default reps to 10', () => {
      expect(createWorkoutExerciseSchema.parse({}).reps).toBe('10');
    });

    it('should default restSeconds to 60', () => {
      expect(createWorkoutExerciseSchema.parse({}).restSeconds).toBe(60);
    });

    it('should reject invalid exerciseId', () => {
      expect(createWorkoutExerciseSchema.safeParse({ exerciseId: 'bad' }).success).toBe(false);
    });
  });

  // ── Assignment ──

  describe('assignWorkoutSchema', () => {
    it('should accept valid assignment', () => {
      expect(assignWorkoutSchema.safeParse({ playerIds: [UUID] }).success).toBe(true);
    });

    it('should reject empty playerIds', () => {
      expect(assignWorkoutSchema.safeParse({ playerIds: [] }).success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      expect(assignWorkoutSchema.safeParse({ playerIds: ['bad'] }).success).toBe(false);
    });
  });

  // ── Workout Log ──

  describe('logWorkoutSchema', () => {
    it('should accept valid log', () => {
      expect(logWorkoutSchema.safeParse({ sessionId: UUID }).success).toBe(true);
    });

    it('should reject invalid sessionId', () => {
      expect(logWorkoutSchema.safeParse({ sessionId: 'bad' }).success).toBe(false);
    });
  });

  // ── Food Database ──

  describe('createFoodSchema', () => {
    it('should accept valid food', () => {
      expect(createFoodSchema.safeParse({ nameEn: 'Chicken' }).success).toBe(true);
    });

    it('should reject empty nameEn', () => {
      expect(createFoodSchema.safeParse({ nameEn: '' }).success).toBe(false);
    });

    it('should default servingSize to 100', () => {
      expect(createFoodSchema.parse({ nameEn: 'Test' }).servingSize).toBe(100);
    });

    it('should default servingUnit to g', () => {
      expect(createFoodSchema.parse({ nameEn: 'Test' }).servingUnit).toBe('g');
    });

    it('should reject negative calories', () => {
      expect(createFoodSchema.safeParse({ nameEn: 'Test', caloriesPer100g: -1 }).success).toBe(false);
    });
  });

  // ── Diet Plans ──

  describe('createDietPlanSchema', () => {
    it('should accept valid diet plan', () => {
      expect(createDietPlanSchema.safeParse({ nameEn: 'Cutting Plan' }).success).toBe(true);
    });

    it('should default type to weekly', () => {
      expect(createDietPlanSchema.parse({ nameEn: 'Test' }).type).toBe('weekly');
    });

    it('should default isTemplate to false', () => {
      expect(createDietPlanSchema.parse({ nameEn: 'Test' }).isTemplate).toBe(false);
    });

    it('should reject invalid type', () => {
      expect(createDietPlanSchema.safeParse({ nameEn: 'Test', type: 'biweekly' }).success).toBe(false);
    });
  });

  describe('updateDietPlanSchema', () => {
    it('should accept status change', () => {
      expect(updateDietPlanSchema.safeParse({ status: 'archived' }).success).toBe(true);
    });

    it('should reject invalid status', () => {
      expect(updateDietPlanSchema.safeParse({ status: 'deleted' }).success).toBe(false);
    });
  });

  // ── Diet Meals ──

  describe('createDietMealSchema', () => {
    it('should accept valid meal', () => {
      expect(createDietMealSchema.safeParse({ dayNumber: 1, mealType: 'breakfast' }).success).toBe(true);
    });

    it('should default mealType to lunch', () => {
      expect(createDietMealSchema.parse({}).mealType).toBe('lunch');
    });

    it('should accept suhoor and iftar', () => {
      expect(createDietMealSchema.safeParse({ mealType: 'suhoor' }).success).toBe(true);
      expect(createDietMealSchema.safeParse({ mealType: 'iftar' }).success).toBe(true);
    });

    it('should reject invalid mealType', () => {
      expect(createDietMealSchema.safeParse({ mealType: 'brunch' }).success).toBe(false);
    });

    it('should accept items array', () => {
      expect(createDietMealSchema.safeParse({
        dayNumber: 1, mealType: 'lunch',
        items: [{ foodId: UUID, servingSize: 200, servingUnit: 'g' }],
      }).success).toBe(true);
    });
  });

  // ── Adherence ──

  describe('logAdherenceSchema', () => {
    it('should accept valid adherence', () => {
      expect(logAdherenceSchema.safeParse({ status: 'ate' }).success).toBe(true);
    });

    it('should default status to ate', () => {
      expect(logAdherenceSchema.parse({}).status).toBe('ate');
    });

    it('should accept skipped and partial', () => {
      expect(logAdherenceSchema.safeParse({ status: 'skipped' }).success).toBe(true);
      expect(logAdherenceSchema.safeParse({ status: 'partial' }).success).toBe(true);
    });

    it('should reject invalid status', () => {
      expect(logAdherenceSchema.safeParse({ status: 'missed' }).success).toBe(false);
    });
  });
});
