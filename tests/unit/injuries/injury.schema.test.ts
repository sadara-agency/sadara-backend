import {
  createInjurySchema,
  updateInjurySchema,
  addInjuryUpdateSchema,
  injuryQuerySchema,
} from '../../../src/modules/injuries/injury.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Injury Schemas', () => {
  describe('createInjurySchema', () => {
    const valid = { playerId: UUID, injuryType: 'ACL Tear', bodyPart: 'Knee', injuryDate: '2025-01-15' };

    it('should accept valid input', () => {
      expect(createInjurySchema.safeParse(valid).success).toBe(true);
    });
    it('should reject missing playerId', () => {
      expect(createInjurySchema.safeParse({ ...valid, playerId: undefined }).success).toBe(false);
    });
    it('should reject invalid date format', () => {
      expect(createInjurySchema.safeParse({ ...valid, injuryDate: '15-01-2025' }).success).toBe(false);
    });
    it('should default severity to Moderate', () => {
      expect(createInjurySchema.parse(valid).severity).toBe('Moderate');
    });
    it('should default cause to Unknown', () => {
      expect(createInjurySchema.parse(valid).cause).toBe('Unknown');
    });
    it('should reject invalid severity', () => {
      expect(createInjurySchema.safeParse({ ...valid, severity: 'Extreme' }).success).toBe(false);
    });
  });

  describe('addInjuryUpdateSchema', () => {
    it('should accept valid update', () => {
      expect(addInjuryUpdateSchema.safeParse({ notes: 'Improving' }).success).toBe(true);
    });
    it('should reject empty notes', () => {
      expect(addInjuryUpdateSchema.safeParse({ notes: '' }).success).toBe(false);
    });
    it('should accept status change', () => {
      expect(addInjuryUpdateSchema.safeParse({ notes: 'Recovered', status: 'Recovered' }).success).toBe(true);
    });
  });

  describe('injuryQuerySchema', () => {
    it('should accept valid filters', () => {
      expect(injuryQuerySchema.safeParse({ status: 'UnderTreatment', severity: 'Severe' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(injuryQuerySchema.safeParse({ status: 'Dead' }).success).toBe(false);
    });
  });
});
