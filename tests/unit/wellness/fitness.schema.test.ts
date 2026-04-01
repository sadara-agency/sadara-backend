import {
  createExerciseSchema,
  updateExerciseSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  logWorkoutSchema,
} from '../../../src/modules/wellness/wellness.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';

describe('Fitness Schemas', () => {
  // ══════════════════════════════════════════
  // Exercise
  // ══════════════════════════════════════════

  describe('createExerciseSchema', () => {
    it('should accept valid exercise', () => {
      const result = createExerciseSchema.safeParse({
        name: 'Bench Press',
        muscleGroup: 'chest',
      });
      expect(result.success).toBe(true);
    });

    it('should default equipment to none', () => {
      const data = createExerciseSchema.parse({
        name: 'Push Up',
        muscleGroup: 'chest',
      });
      expect(data.equipment).toBe('none');
    });

    it('should reject invalid muscle group', () => {
      expect(
        createExerciseSchema.safeParse({
          name: 'Test',
          muscleGroup: 'wings',
        }).success,
      ).toBe(false);
    });

    it('should reject empty name', () => {
      expect(
        createExerciseSchema.safeParse({
          name: '',
          muscleGroup: 'chest',
        }).success,
      ).toBe(false);
    });

    it('should accept all optional fields', () => {
      const result = createExerciseSchema.safeParse({
        name: 'Barbell Row',
        nameAr: 'تجديف بالبار',
        muscleGroup: 'back',
        equipment: 'barbell',
        videoUrl: 'https://youtube.com/watch?v=abc',
        instructions: 'Pull towards belly button',
        instructionsAr: 'اسحب نحو السرة',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid equipment', () => {
      expect(
        createExerciseSchema.safeParse({
          name: 'Test',
          muscleGroup: 'chest',
          equipment: 'sword',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateExerciseSchema', () => {
    it('should accept partial update', () => {
      expect(
        updateExerciseSchema.safeParse({ name: 'New Name' }).success,
      ).toBe(true);
    });

    it('should accept isActive field', () => {
      expect(
        updateExerciseSchema.safeParse({ isActive: false }).success,
      ).toBe(true);
    });

    it('should accept empty update', () => {
      expect(updateExerciseSchema.safeParse({}).success).toBe(true);
    });
  });

  // ══════════════════════════════════════════
  // Template
  // ══════════════════════════════════════════

  describe('createTemplateSchema', () => {
    it('should accept valid template with exercises', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Push Day',
        exercises: [
          { exerciseId: UUID, orderIndex: 0 },
          { exerciseId: UUID2, orderIndex: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should default category to strength', () => {
      const data = createTemplateSchema.parse({
        name: 'Test',
        exercises: [{ exerciseId: UUID, orderIndex: 0 }],
      });
      expect(data.category).toBe('strength');
    });

    it('should reject template without exercises', () => {
      expect(
        createTemplateSchema.safeParse({
          name: 'Empty',
          exercises: [],
        }).success,
      ).toBe(false);
    });

    it('should reject invalid category', () => {
      expect(
        createTemplateSchema.safeParse({
          name: 'Test',
          category: 'crossfit',
          exercises: [{ exerciseId: UUID, orderIndex: 0 }],
        }).success,
      ).toBe(false);
    });

    it('should accept all exercise fields', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Full Template',
        description: 'A complete workout',
        category: 'hypertrophy',
        estimatedMinutes: 60,
        exercises: [
          {
            exerciseId: UUID,
            orderIndex: 0,
            targetSets: 4,
            targetReps: '10-12',
            targetWeightKg: 80,
            restSeconds: 120,
            notes: 'Go heavy',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should default exercise targetSets to 3', () => {
      const data = createTemplateSchema.parse({
        name: 'Test',
        exercises: [{ exerciseId: UUID, orderIndex: 0 }],
      });
      expect(data.exercises[0].targetSets).toBe(3);
    });

    it('should default exercise targetReps to 8-12', () => {
      const data = createTemplateSchema.parse({
        name: 'Test',
        exercises: [{ exerciseId: UUID, orderIndex: 0 }],
      });
      expect(data.exercises[0].targetReps).toBe('8-12');
    });
  });

  describe('updateTemplateSchema', () => {
    it('should accept partial update without exercises', () => {
      expect(
        updateTemplateSchema.safeParse({ name: 'New Name' }).success,
      ).toBe(true);
    });

    it('should accept exercises replacement', () => {
      expect(
        updateTemplateSchema.safeParse({
          exercises: [{ exerciseId: UUID, orderIndex: 0 }],
        }).success,
      ).toBe(true);
    });

    it('should accept isActive field', () => {
      expect(
        updateTemplateSchema.safeParse({ isActive: false }).success,
      ).toBe(true);
    });
  });

  // ══════════════════════════════════════════
  // Assignment
  // ══════════════════════════════════════════

  describe('createAssignmentSchema', () => {
    it('should accept valid assignment', () => {
      const result = createAssignmentSchema.safeParse({
        playerId: UUID,
        templateId: UUID2,
        assignedDate: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      expect(
        createAssignmentSchema.safeParse({
          playerId: UUID,
          templateId: UUID2,
          assignedDate: '03/23/2026',
        }).success,
      ).toBe(false);
    });

    it('should reject invalid UUID', () => {
      expect(
        createAssignmentSchema.safeParse({
          playerId: 'bad',
          templateId: UUID2,
          assignedDate: '2026-03-23',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateAssignmentSchema', () => {
    it('should accept status update', () => {
      expect(
        updateAssignmentSchema.safeParse({ status: 'completed' }).success,
      ).toBe(true);
    });

    it('should reject invalid status', () => {
      expect(
        updateAssignmentSchema.safeParse({ status: 'cancelled' }).success,
      ).toBe(false);
    });

    it('should accept empty update', () => {
      expect(updateAssignmentSchema.safeParse({}).success).toBe(true);
    });
  });

  // ══════════════════════════════════════════
  // Workout Log
  // ══════════════════════════════════════════

  describe('logWorkoutSchema', () => {
    it('should accept valid workout log', () => {
      const result = logWorkoutSchema.safeParse({
        sets: [
          { exerciseId: UUID, setNumber: 1, actualReps: 10, actualWeightKg: 80 },
          { exerciseId: UUID, setNumber: 2, actualReps: 8, actualWeightKg: 80, rpe: 8.5 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty sets', () => {
      expect(
        logWorkoutSchema.safeParse({ sets: [] }).success,
      ).toBe(false);
    });

    it('should reject RPE > 10', () => {
      expect(
        logWorkoutSchema.safeParse({
          sets: [{ exerciseId: UUID, setNumber: 1, rpe: 11 }],
        }).success,
      ).toBe(false);
    });

    it('should reject RPE < 1', () => {
      expect(
        logWorkoutSchema.safeParse({
          sets: [{ exerciseId: UUID, setNumber: 1, rpe: 0 }],
        }).success,
      ).toBe(false);
    });

    it('should accept minimal set (just exercise + set number)', () => {
      const result = logWorkoutSchema.safeParse({
        sets: [{ exerciseId: UUID, setNumber: 1 }],
      });
      expect(result.success).toBe(true);
    });

    it('should reject set number 0', () => {
      expect(
        logWorkoutSchema.safeParse({
          sets: [{ exerciseId: UUID, setNumber: 0 }],
        }).success,
      ).toBe(false);
    });
  });
});
