import {
  createSessionSchema,
  updateSessionSchema,
  sessionQuerySchema,
} from '../../../src/modules/sessions/session.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Session Schemas', () => {
  describe('createSessionSchema', () => {
    const valid = {
      playerId: UUID,
      referralId: UUID,
      sessionType: 'Physical',
      programOwner: 'FitnessCoach',
      sessionDate: '2026-04-10',
    };

    it('should accept valid session', () => {
      expect(createSessionSchema.safeParse(valid).success).toBe(true);
    });
    it('should default completionStatus to Scheduled', () => {
      expect(createSessionSchema.parse(valid).completionStatus).toBe('Scheduled');
    });
    it('should reject invalid sessionType', () => {
      expect(createSessionSchema.safeParse({ ...valid, sessionType: 'Invalid' }).success).toBe(false);
    });
    it('should reject invalid programOwner', () => {
      expect(createSessionSchema.safeParse({ ...valid, programOwner: 'Nobody' }).success).toBe(false);
    });
    it('should reject invalid date format', () => {
      expect(createSessionSchema.safeParse({ ...valid, sessionDate: '10-04-2026' }).success).toBe(false);
    });
    it('should reject missing playerId', () => {
      const { playerId, ...rest } = valid;
      expect(createSessionSchema.safeParse(rest).success).toBe(false);
    });
    it('should reject missing referralId', () => {
      const { referralId, ...rest } = valid;
      expect(createSessionSchema.safeParse(rest).success).toBe(false);
    });
    it('should accept optional notes', () => {
      expect(createSessionSchema.safeParse({ ...valid, notes: 'test notes' }).success).toBe(true);
    });
    it('should accept all completion statuses', () => {
      for (const s of ['Scheduled', 'Completed', 'Cancelled', 'NoShow']) {
        expect(createSessionSchema.safeParse({ ...valid, completionStatus: s }).success).toBe(true);
      }
    });
    it('should accept all session types', () => {
      for (const t of ['Physical', 'Skill', 'Tactical', 'Mental', 'Nutrition', 'PerformanceAssessment', 'Goalkeeper']) {
        expect(createSessionSchema.safeParse({ ...valid, sessionType: t }).success).toBe(true);
      }
    });
    it('should accept all program owners', () => {
      for (const o of ['FitnessCoach', 'Coach', 'SkillCoach', 'TacticalCoach', 'GoalkeeperCoach', 'Analyst', 'NutritionSpecialist', 'MentalCoach']) {
        expect(createSessionSchema.safeParse({ ...valid, programOwner: o }).success).toBe(true);
      }
    });
  });

  describe('updateSessionSchema', () => {
    it('should accept partial update', () => {
      expect(updateSessionSchema.safeParse({ notes: 'updated' }).success).toBe(true);
    });
    it('should accept empty update', () => {
      expect(updateSessionSchema.safeParse({}).success).toBe(true);
    });
    it('should accept completionStatus change', () => {
      expect(updateSessionSchema.safeParse({ completionStatus: 'Completed' }).success).toBe(true);
    });
    it('should reject invalid completionStatus', () => {
      expect(updateSessionSchema.safeParse({ completionStatus: 'Done' }).success).toBe(false);
    });
  });

  describe('sessionQuerySchema', () => {
    it('should default sort to session_date', () => {
      expect(sessionQuerySchema.parse({}).sort).toBe('session_date');
    });
    it('should default page to 1', () => {
      expect(sessionQuerySchema.parse({}).page).toBe(1);
    });
    it('should default limit to 20', () => {
      expect(sessionQuerySchema.parse({}).limit).toBe(20);
    });
    it('should accept all filters', () => {
      expect(sessionQuerySchema.safeParse({
        playerId: UUID,
        referralId: UUID,
        sessionType: 'Mental',
        programOwner: 'MentalCoach',
        completionStatus: 'Scheduled',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      }).success).toBe(true);
    });
    it('should reject invalid date format in filters', () => {
      expect(sessionQuerySchema.safeParse({ dateFrom: 'Jan 1' }).success).toBe(false);
    });
  });
});
