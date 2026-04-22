import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateBMI,
  calculateRingScore,
  calculateReadinessScore,
} from '../../../src/modules/wellness/wellness.helpers';

describe('Wellness Helpers', () => {
  // ══════════════════════════════════════════
  // BMR (Mifflin-St Jeor)
  // ══════════════════════════════════════════

  describe('calculateBMR', () => {
    it('should compute male BMR correctly', () => {
      // 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
      expect(calculateBMR(80, 180, 25, 'male')).toBe(1805);
    });

    it('should compute female BMR correctly', () => {
      // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
      expect(calculateBMR(60, 165, 30, 'female')).toBe(1320.25);
    });

    it('should handle edge case — very light person', () => {
      const bmr = calculateBMR(40, 150, 18, 'female');
      expect(bmr).toBeGreaterThan(0);
    });

    it('should handle edge case — heavy person', () => {
      const bmr = calculateBMR(120, 195, 35, 'male');
      expect(bmr).toBeGreaterThan(2000);
    });
  });

  // ══════════════════════════════════════════
  // TDEE
  // ══════════════════════════════════════════

  describe('calculateTDEE', () => {
    it('should multiply BMR by activity level', () => {
      expect(calculateTDEE(1805, 1.55)).toBe(Math.round(1805 * 1.55));
    });

    it('should return rounded value', () => {
      const tdee = calculateTDEE(1500, 1.375);
      expect(Number.isInteger(tdee)).toBe(true);
    });

    it('should compute sedentary correctly', () => {
      expect(calculateTDEE(2000, 1.2)).toBe(2400);
    });

    it('should compute extra active correctly', () => {
      expect(calculateTDEE(2000, 1.9)).toBe(3800);
    });
  });

  // ══════════════════════════════════════════
  // Macros
  // ══════════════════════════════════════════

  describe('calculateMacros', () => {
    it('should add surplus for bulk', () => {
      const macros = calculateMacros(2800, 80, 'bulk');
      expect(macros.calories).toBe(3200); // 2800 + 400
    });

    it('should subtract deficit for cut', () => {
      const macros = calculateMacros(2800, 80, 'cut');
      expect(macros.calories).toBe(2400); // 2800 - 400
    });

    it('should keep calories same for maintenance', () => {
      const macros = calculateMacros(2800, 80, 'maintenance');
      expect(macros.calories).toBe(2800);
    });

    it('should use 2.0g/kg protein for bulk', () => {
      const macros = calculateMacros(2800, 80, 'bulk');
      expect(macros.proteinG).toBe(160); // 80 * 2.0
    });

    it('should use 2.2g/kg protein for cut', () => {
      const macros = calculateMacros(2800, 80, 'cut');
      expect(macros.proteinG).toBe(176); // 80 * 2.2
    });

    it('should allocate 22.5% calories to fat', () => {
      const macros = calculateMacros(2800, 80, 'maintenance');
      const expectedFatCal = 2800 * 0.225;
      const expectedFatG = Math.round((expectedFatCal / 9) * 10) / 10;
      expect(macros.fatG).toBe(expectedFatG);
    });

    it('should allocate remaining to carbs', () => {
      const macros = calculateMacros(2800, 80, 'maintenance');
      const proteinCal = macros.proteinG * 4;
      const fatCal = macros.fatG * 9;
      const carbCal = macros.carbsG * 4;
      // Total macro calories should be close to target
      expect(proteinCal + fatCal + carbCal).toBeCloseTo(macros.calories, -1);
    });

    it('should never return negative carbs', () => {
      // Very low TDEE scenario
      const macros = calculateMacros(800, 80, 'cut');
      expect(macros.carbsG).toBeGreaterThanOrEqual(0);
    });
  });

  // ══════════════════════════════════════════
  // BMI
  // ══════════════════════════════════════════

  describe('calculateBMI', () => {
    it('should compute BMI correctly', () => {
      // 80 / (1.80)^2 = 80 / 3.24 = 24.69... → 24.7
      expect(calculateBMI(80, 180)).toBe(24.7);
    });

    it('should detect underweight', () => {
      expect(calculateBMI(45, 175)).toBeLessThan(18.5);
    });

    it('should detect normal weight', () => {
      const bmi = calculateBMI(70, 175);
      expect(bmi).toBeGreaterThanOrEqual(18.5);
      expect(bmi).toBeLessThan(25);
    });

    it('should detect overweight', () => {
      const bmi = calculateBMI(90, 175);
      expect(bmi).toBeGreaterThanOrEqual(25);
    });
  });

  // ══════════════════════════════════════════
  // Ring Score
  // ══════════════════════════════════════════

  describe('calculateRingScore', () => {
    it('should return 100 for a perfect pulse', () => {
      expect(
        calculateRingScore({ readinessScore: 100, sleepQuality: 5, nutritionRating: 5, trainingType: 'club_session' }),
      ).toBe(100);
    });

    it('should return 0 for worst-case pulse', () => {
      expect(
        calculateRingScore({ readinessScore: 0, sleepQuality: 1, nutritionRating: 1, trainingType: 'rest' }),
      ).toBe(0);
    });

    it('should return 50 when all fields are null (neutral defaults)', () => {
      expect(calculateRingScore({})).toBe(50);
    });

    it('should weight readiness at 30%', () => {
      // readiness=100, rest neutral (50 each) → 100*0.3 + 50*0.25 + 50*0.25 + 50*0.2 = 65
      expect(calculateRingScore({ readinessScore: 100 })).toBe(65);
    });

    it('should weight sleepQuality=5 at 25%', () => {
      // sleep=100, rest neutral → 50*0.3 + 100*0.25 + 50*0.25 + 50*0.2 = 63
      expect(calculateRingScore({ sleepQuality: 5 })).toBe(63);
    });

    it('should weight nutritionRating=5 at 25%', () => {
      // nutrition=100, rest neutral → 50*0.3 + 50*0.25 + 100*0.25 + 50*0.2 = 63
      expect(calculateRingScore({ nutritionRating: 5 })).toBe(63);
    });

    it('should score rest trainingType as 0 (20% weight, others neutral)', () => {
      // training=0, rest neutral → 50*0.3 + 50*0.25 + 50*0.25 + 0*0.2 = 40
      expect(calculateRingScore({ trainingType: 'rest' })).toBe(40);
    });

    it('should score any non-rest trainingType as 100 at 20% weight', () => {
      // training=100, rest neutral → 50*0.3 + 50*0.25 + 50*0.25 + 100*0.2 = 60
      expect(calculateRingScore({ trainingType: 'program_session' })).toBe(60);
    });

    it('should cap readinessScore > 100 at 100', () => {
      expect(
        calculateRingScore({ readinessScore: 150, sleepQuality: 5, nutritionRating: 5, trainingType: 'club_session' }),
      ).toBe(100);
    });

    it('should floor readinessScore < 0 at 0', () => {
      expect(
        calculateRingScore({ readinessScore: -50, sleepQuality: 1, nutritionRating: 1, trainingType: 'rest' }),
      ).toBe(0);
    });
  });

  // ══════════════════════════════════════════
  // Readiness Score
  // ══════════════════════════════════════════

  describe('calculateReadinessScore', () => {
    it('should return 100 for best possible values', () => {
      const score = calculateReadinessScore({
        sleepHours: 8,
        sleepQuality: 5,
        fatigue: 1,
        muscleSoreness: 1,
        mood: 5,
        stress: 1,
      });
      expect(score).toBe(100);
    });

    it('should return 0 for worst possible values', () => {
      const score = calculateReadinessScore({
        sleepHours: 3,
        sleepQuality: 1,
        fatigue: 5,
        muscleSoreness: 5,
        mood: 1,
        stress: 5,
      });
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should return 50 when no data provided', () => {
      expect(calculateReadinessScore({})).toBe(50);
    });

    it('should handle partial data (only sleep)', () => {
      const score = calculateReadinessScore({ sleepQuality: 5 });
      expect(score).toBe(100);
    });

    it('should invert fatigue (higher = worse)', () => {
      const fresh = calculateReadinessScore({ fatigue: 1 });
      const exhausted = calculateReadinessScore({ fatigue: 5 });
      expect(fresh).toBeGreaterThan(exhausted);
    });

    it('should invert stress (higher = worse)', () => {
      const calm = calculateReadinessScore({ stress: 1 });
      const stressed = calculateReadinessScore({ stress: 5 });
      expect(calm).toBeGreaterThan(stressed);
    });

    it('should score optimal sleep hours (7-9h) at 100', () => {
      const score = calculateReadinessScore({ sleepHours: 8 });
      expect(score).toBe(100);
    });

    it('should score low sleep hours poorly', () => {
      const score = calculateReadinessScore({ sleepHours: 4 });
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should score oversleep moderately', () => {
      const score = calculateReadinessScore({ sleepHours: 11 });
      expect(score).toBe(60);
    });

    it('should return value between 0 and 100', () => {
      const score = calculateReadinessScore({
        sleepHours: 6,
        sleepQuality: 3,
        fatigue: 3,
        muscleSoreness: 3,
        mood: 3,
        stress: 3,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
