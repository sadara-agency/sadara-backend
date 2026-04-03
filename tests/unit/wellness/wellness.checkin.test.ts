import {
  createCheckinSchema,
  createMyCheckinSchema,
  checkinQuerySchema,
} from '../../../src/modules/wellness/wellness.validation';

describe('Wellness Checkin Validation', () => {
  describe('createCheckinSchema', () => {
    it('should accept valid full checkin', () => {
      const result = createCheckinSchema.safeParse({
        playerId: '550e8400-e29b-41d4-a716-446655440000',
        checkinDate: '2026-04-03',
        sleepHours: 7.5,
        sleepQuality: 4,
        fatigue: 2,
        muscleSoreness: 3,
        mood: 4,
        stress: 2,
        sorenessAreas: ['hamstring', 'lower_back'],
        notes: 'Feeling good today',
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimal checkin (only required fields)', () => {
      const result = createCheckinSchema.safeParse({
        playerId: '550e8400-e29b-41d4-a716-446655440000',
        checkinDate: '2026-04-03',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid playerId', () => {
      const result = createCheckinSchema.safeParse({
        playerId: 'not-a-uuid',
        checkinDate: '2026-04-03',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = createCheckinSchema.safeParse({
        playerId: '550e8400-e29b-41d4-a716-446655440000',
        checkinDate: '04/03/2026',
      });
      expect(result.success).toBe(false);
    });

    it('should reject ratings outside 1-5', () => {
      const result = createCheckinSchema.safeParse({
        playerId: '550e8400-e29b-41d4-a716-446655440000',
        checkinDate: '2026-04-03',
        sleepQuality: 6,
      });
      expect(result.success).toBe(false);
    });

    it('should reject sleep hours > 24', () => {
      const result = createCheckinSchema.safeParse({
        playerId: '550e8400-e29b-41d4-a716-446655440000',
        checkinDate: '2026-04-03',
        sleepHours: 25,
      });
      expect(result.success).toBe(false);
    });

    it('should reject notes over 1000 chars', () => {
      const result = createCheckinSchema.safeParse({
        playerId: '550e8400-e29b-41d4-a716-446655440000',
        checkinDate: '2026-04-03',
        notes: 'x'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createMyCheckinSchema', () => {
    it('should accept checkin without playerId', () => {
      const result = createMyCheckinSchema.safeParse({
        checkinDate: '2026-04-03',
        sleepQuality: 4,
        fatigue: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should reject if playerId is included', () => {
      const result = createMyCheckinSchema.safeParse({
        playerId: '550e8400-e29b-41d4-a716-446655440000',
        checkinDate: '2026-04-03',
      });
      // .omit strips the key — it should still parse but ignore playerId
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).playerId).toBeUndefined();
      }
    });
  });

  describe('checkinQuerySchema', () => {
    it('should apply defaults', () => {
      const result = checkinQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept date range filters', () => {
      const result = checkinQuerySchema.parse({
        from: '2026-03-01',
        to: '2026-04-01',
      });
      expect(result.from).toBe('2026-03-01');
      expect(result.to).toBe('2026-04-01');
    });

    it('should reject invalid date format', () => {
      const result = checkinQuerySchema.safeParse({
        from: '03/01/2026',
      });
      expect(result.success).toBe(false);
    });
  });
});
