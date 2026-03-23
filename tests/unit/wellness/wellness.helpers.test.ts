import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  calculateBMI,
  calculateRingScore,
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
    it('should return 100 for perfect adherence', () => {
      expect(calculateRingScore(100, 100, true)).toBe(100);
    });

    it('should return 0 for zero adherence', () => {
      expect(calculateRingScore(0, 0, false)).toBe(0);
    });

    it('should weight calories at 40%', () => {
      expect(calculateRingScore(100, 0, false)).toBe(40);
    });

    it('should weight protein at 30%', () => {
      expect(calculateRingScore(0, 100, false)).toBe(30);
    });

    it('should weight workout at 30%', () => {
      expect(calculateRingScore(0, 0, true)).toBe(30);
    });

    it('should cap at 100 even with over-adherence', () => {
      expect(calculateRingScore(150, 150, true)).toBe(100);
    });

    it('should floor at 0 for negative input', () => {
      expect(calculateRingScore(-10, -10, false)).toBe(0);
    });
  });
});
