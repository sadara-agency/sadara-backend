import {
  createCourseSchema,
  updateCourseSchema,
  enrollPlayersSchema,
  updateEnrollmentSchema,
  trackActivitySchema,
  selfUpdateProgressSchema,
} from '../../../src/modules/training/training.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Training Schemas', () => {
  describe('createCourseSchema', () => {
    it('should accept valid course', () => {
      expect(createCourseSchema.safeParse({ title: 'Fitness 101' }).success).toBe(true);
    });
    it('should reject empty title', () => {
      expect(createCourseSchema.safeParse({ title: '' }).success).toBe(false);
    });
    it('should default contentType to Mixed', () => {
      expect(createCourseSchema.parse({ title: 'Test' }).contentType).toBe('Mixed');
    });
    it('should default difficulty to Intermediate', () => {
      expect(createCourseSchema.parse({ title: 'Test' }).difficulty).toBe('Intermediate');
    });
    it('should reject invalid contentUrl', () => {
      expect(createCourseSchema.safeParse({ title: 'Test', contentUrl: 'not-url' }).success).toBe(false);
    });
  });

  describe('enrollPlayersSchema', () => {
    it('should accept valid player list', () => {
      expect(enrollPlayersSchema.safeParse({ playerIds: [UUID] }).success).toBe(true);
    });
    it('should reject empty list', () => {
      expect(enrollPlayersSchema.safeParse({ playerIds: [] }).success).toBe(false);
    });
    it('should reject invalid UUID', () => {
      expect(enrollPlayersSchema.safeParse({ playerIds: ['bad'] }).success).toBe(false);
    });
  });

  describe('updateEnrollmentSchema', () => {
    it('should accept valid status', () => {
      expect(updateEnrollmentSchema.safeParse({ status: 'Completed' }).success).toBe(true);
    });
    it('should reject progress > 100', () => {
      expect(updateEnrollmentSchema.safeParse({ progressPct: 101 }).success).toBe(false);
    });
  });

  describe('trackActivitySchema', () => {
    it('should accept valid action', () => {
      expect(trackActivitySchema.safeParse({ action: 'VideoStarted' }).success).toBe(true);
    });
    it('should reject invalid action', () => {
      expect(trackActivitySchema.safeParse({ action: 'Paused' }).success).toBe(false);
    });
  });

  describe('selfUpdateProgressSchema', () => {
    it('should accept valid progress', () => {
      expect(selfUpdateProgressSchema.safeParse({ progressPct: 50 }).success).toBe(true);
    });
    it('should reject progress < 0', () => {
      expect(selfUpdateProgressSchema.safeParse({ progressPct: -1 }).success).toBe(false);
    });
  });
});
