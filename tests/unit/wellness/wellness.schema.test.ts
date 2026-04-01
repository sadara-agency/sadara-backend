import {
  createProfileSchema,
  updateProfileSchema,
  createWeightLogSchema,
  createMyWeightLogSchema,
  createFoodItemSchema,
  createMealLogSchema,
  updateMealLogSchema,
  createMyMealLogSchema,
  copyDaySchema,
  copyMyDaySchema,
} from '../../../src/modules/wellness/wellness.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Wellness Schemas', () => {
  // ══════════════════════════════════════════
  // Profile
  // ══════════════════════════════════════════

  describe('createProfileSchema', () => {
    it('should accept valid profile', () => {
      const result = createProfileSchema.safeParse({
        playerId: UUID,
        sex: 'male',
      });
      expect(result.success).toBe(true);
    });

    it('should default activityLevel to 1.55', () => {
      const data = createProfileSchema.parse({ playerId: UUID, sex: 'female' });
      expect(data.activityLevel).toBe(1.55);
    });

    it('should default goal to maintenance', () => {
      const data = createProfileSchema.parse({ playerId: UUID, sex: 'male' });
      expect(data.goal).toBe('maintenance');
    });

    it('should reject invalid sex', () => {
      expect(
        createProfileSchema.safeParse({ playerId: UUID, sex: 'other' }).success,
      ).toBe(false);
    });

    it('should reject invalid UUID', () => {
      expect(
        createProfileSchema.safeParse({ playerId: 'bad', sex: 'male' }).success,
      ).toBe(false);
    });

    it('should reject activityLevel below 1.0', () => {
      expect(
        createProfileSchema.safeParse({
          playerId: UUID,
          sex: 'male',
          activityLevel: 0.5,
        }).success,
      ).toBe(false);
    });

    it('should reject activityLevel above 2.5', () => {
      expect(
        createProfileSchema.safeParse({
          playerId: UUID,
          sex: 'male',
          activityLevel: 3.0,
        }).success,
      ).toBe(false);
    });

    it('should reject invalid goal', () => {
      expect(
        createProfileSchema.safeParse({
          playerId: UUID,
          sex: 'male',
          goal: 'shred',
        }).success,
      ).toBe(false);
    });

    it('should accept optional target fields', () => {
      const result = createProfileSchema.safeParse({
        playerId: UUID,
        sex: 'male',
        targetCalories: 2500,
        targetProteinG: 180,
        targetFatG: 70,
        targetCarbsG: 250,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative calories', () => {
      expect(
        createProfileSchema.safeParse({
          playerId: UUID,
          sex: 'male',
          targetCalories: -100,
        }).success,
      ).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept partial update', () => {
      expect(updateProfileSchema.safeParse({ goal: 'cut' }).success).toBe(true);
    });

    it('should accept empty update', () => {
      expect(updateProfileSchema.safeParse({}).success).toBe(true);
    });

    it('should not accept playerId', () => {
      const data = updateProfileSchema.parse({ playerId: UUID, goal: 'bulk' });
      expect((data as any).playerId).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════
  // Weight Log
  // ══════════════════════════════════════════

  describe('createWeightLogSchema', () => {
    it('should accept valid weight log', () => {
      const result = createWeightLogSchema.safeParse({
        playerId: UUID,
        weightKg: 75.5,
        loggedAt: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero weight', () => {
      expect(
        createWeightLogSchema.safeParse({
          playerId: UUID,
          weightKg: 0,
          loggedAt: '2026-03-23',
        }).success,
      ).toBe(false);
    });

    it('should reject weight over 500', () => {
      expect(
        createWeightLogSchema.safeParse({
          playerId: UUID,
          weightKg: 501,
          loggedAt: '2026-03-23',
        }).success,
      ).toBe(false);
    });

    it('should reject invalid date format', () => {
      expect(
        createWeightLogSchema.safeParse({
          playerId: UUID,
          weightKg: 75,
          loggedAt: '03/23/2026',
        }).success,
      ).toBe(false);
    });

    it('should accept optional bodyFatPct', () => {
      const result = createWeightLogSchema.safeParse({
        playerId: UUID,
        weightKg: 75,
        bodyFatPct: 15.5,
        loggedAt: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });

    it('should reject bodyFatPct over 100', () => {
      expect(
        createWeightLogSchema.safeParse({
          playerId: UUID,
          weightKg: 75,
          bodyFatPct: 101,
          loggedAt: '2026-03-23',
        }).success,
      ).toBe(false);
    });
  });

  describe('createMyWeightLogSchema', () => {
    it('should not require playerId', () => {
      const result = createMyWeightLogSchema.safeParse({
        weightKg: 75,
        loggedAt: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });

    it('should strip playerId if provided', () => {
      const data = createMyWeightLogSchema.parse({
        playerId: UUID,
        weightKg: 75,
        loggedAt: '2026-03-23',
      });
      expect((data as any).playerId).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════
  // Food Item
  // ══════════════════════════════════════════

  describe('createFoodItemSchema', () => {
    it('should accept valid food item', () => {
      const result = createFoodItemSchema.safeParse({
        name: 'Chicken Breast',
        calories: 165,
        proteinG: 31,
        carbsG: 0,
        fatG: 3.6,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      expect(
        createFoodItemSchema.safeParse({
          name: '',
          calories: 100,
          proteinG: 10,
          carbsG: 10,
          fatG: 5,
        }).success,
      ).toBe(false);
    });

    it('should reject negative calories', () => {
      expect(
        createFoodItemSchema.safeParse({
          name: 'Test',
          calories: -10,
          proteinG: 10,
          carbsG: 10,
          fatG: 5,
        }).success,
      ).toBe(false);
    });

    it('should accept optional fields', () => {
      const result = createFoodItemSchema.safeParse({
        name: 'Rice',
        brand: 'Uncle Ben',
        servingQty: 1,
        servingUnit: 'cup',
        calories: 200,
        proteinG: 4,
        carbsG: 45,
        fatG: 0.5,
        fiberG: 1.5,
      });
      expect(result.success).toBe(true);
    });

    it('should default servingQty to 1', () => {
      const data = createFoodItemSchema.parse({
        name: 'Egg',
        calories: 78,
        proteinG: 6,
        carbsG: 0.6,
        fatG: 5,
      });
      expect(data.servingQty).toBe(1);
    });
  });

  // ══════════════════════════════════════════
  // Meal Log
  // ══════════════════════════════════════════

  describe('createMealLogSchema', () => {
    it('should accept valid meal log', () => {
      const result = createMealLogSchema.safeParse({
        playerId: UUID,
        mealType: 'lunch',
        calories: 500,
        proteinG: 30,
        carbsG: 60,
        fatG: 15,
        loggedDate: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid meal type', () => {
      expect(
        createMealLogSchema.safeParse({
          playerId: UUID,
          mealType: 'brunch',
          calories: 300,
          proteinG: 20,
          carbsG: 30,
          fatG: 10,
          loggedDate: '2026-03-23',
        }).success,
      ).toBe(false);
    });

    it('should accept optional foodItemId and customName', () => {
      const result = createMealLogSchema.safeParse({
        playerId: UUID,
        mealType: 'snack',
        foodItemId: UUID,
        customName: 'Protein shake',
        servings: 2,
        calories: 240,
        proteinG: 48,
        carbsG: 4,
        fatG: 2,
        loggedDate: '2026-03-23',
        notes: 'Post workout',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      expect(
        createMealLogSchema.safeParse({
          playerId: UUID,
          mealType: 'dinner',
          calories: 700,
          proteinG: 40,
          carbsG: 80,
          fatG: 25,
          loggedDate: '03/23/2026',
        }).success,
      ).toBe(false);
    });

    it('should default servings to 1', () => {
      const data = createMealLogSchema.parse({
        playerId: UUID,
        mealType: 'breakfast',
        calories: 300,
        proteinG: 20,
        carbsG: 30,
        fatG: 10,
        loggedDate: '2026-03-23',
      });
      expect(data.servings).toBe(1);
    });
  });

  describe('updateMealLogSchema', () => {
    it('should accept partial update', () => {
      expect(
        updateMealLogSchema.safeParse({ calories: 600 }).success,
      ).toBe(true);
    });

    it('should accept empty update', () => {
      expect(updateMealLogSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('createMyMealLogSchema', () => {
    it('should not require playerId', () => {
      const result = createMyMealLogSchema.safeParse({
        mealType: 'lunch',
        calories: 500,
        proteinG: 30,
        carbsG: 50,
        fatG: 15,
        loggedDate: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });

    it('should strip playerId if provided', () => {
      const data = createMyMealLogSchema.parse({
        playerId: UUID,
        mealType: 'lunch',
        calories: 500,
        proteinG: 30,
        carbsG: 50,
        fatG: 15,
        loggedDate: '2026-03-23',
      });
      expect((data as any).playerId).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════
  // Copy Day
  // ══════════════════════════════════════════

  describe('copyDaySchema', () => {
    it('should accept valid copy day', () => {
      const result = copyDaySchema.safeParse({
        playerId: UUID,
        fromDate: '2026-03-22',
        toDate: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      expect(
        copyDaySchema.safeParse({
          playerId: UUID,
          fromDate: '2026-3-22',
          toDate: '2026-03-23',
        }).success,
      ).toBe(false);
    });
  });

  describe('copyMyDaySchema', () => {
    it('should not require playerId', () => {
      const result = copyMyDaySchema.safeParse({
        fromDate: '2026-03-22',
        toDate: '2026-03-23',
      });
      expect(result.success).toBe(true);
    });
  });
});
