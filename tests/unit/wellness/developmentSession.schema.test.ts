/// <reference types="jest" />
import {
  createSessionSchema,
  updateSessionSchema,
  completeSessionSchema,
  listSessionsQuerySchema,
  sessionTypeEnum,
  sessionStatusEnum,
} from '../../../src/modules/wellness/developmentSession.validation';

const PLAYER_ID = '00000000-0000-0000-0000-000000000001';
const PROGRAM_ID = '00000000-0000-0000-0000-000000000002';

describe('developmentSession validation schemas', () => {
  // ── sessionTypeEnum ──

  describe('sessionTypeEnum', () => {
    it.each(['club_training', 'development_gym', 'development_field', 'rehab', 'recovery'])(
      'accepts "%s"',
      (value) => {
        expect(sessionTypeEnum.parse(value)).toBe(value);
      },
    );

    it('rejects unknown type', () => {
      expect(() => sessionTypeEnum.parse('crossfit')).toThrow();
    });
  });

  // ── sessionStatusEnum ──

  describe('sessionStatusEnum', () => {
    it.each(['pending', 'completed', 'partial', 'skipped'])(
      'accepts "%s"',
      (value) => {
        expect(sessionStatusEnum.parse(value)).toBe(value);
      },
    );

    it('rejects "in_progress" (removed in Phase 4)', () => {
      expect(() => sessionStatusEnum.parse('in_progress')).toThrow();
    });
  });

  // ── createSessionSchema ──

  describe('createSessionSchema', () => {
    it('accepts valid input', () => {
      const result = createSessionSchema.parse({
        playerId: PLAYER_ID,
        scheduledDate: '2026-04-22',
        sessionType: 'development_gym',
      });
      expect(result.sessionType).toBe('development_gym');
    });

    it('accepts optional programId', () => {
      const result = createSessionSchema.parse({
        playerId: PLAYER_ID,
        programId: PROGRAM_ID,
        scheduledDate: '2026-04-22',
        sessionType: 'rehab',
      });
      expect(result.programId).toBe(PROGRAM_ID);
    });

    it('rejects missing playerId', () => {
      expect(() =>
        createSessionSchema.parse({ scheduledDate: '2026-04-22', sessionType: 'rehab' }),
      ).toThrow();
    });

    it('rejects invalid date format', () => {
      expect(() =>
        createSessionSchema.parse({
          playerId: PLAYER_ID,
          scheduledDate: '22-04-2026',
          sessionType: 'rehab',
        }),
      ).toThrow();
    });

    it('rejects notes exceeding 1000 chars', () => {
      expect(() =>
        createSessionSchema.parse({
          playerId: PLAYER_ID,
          scheduledDate: '2026-04-22',
          sessionType: 'rehab',
          notes: 'x'.repeat(1001),
        }),
      ).toThrow();
    });
  });

  // ── completeSessionSchema ──

  describe('completeSessionSchema', () => {
    it('requires status field', () => {
      expect(() => completeSessionSchema.parse({})).toThrow();
    });

    it('accepts completed with all optional fields', () => {
      const result = completeSessionSchema.parse({
        status: 'completed',
        overallRpe: 8,
        actualDurationMinutes: 60,
        sessionNote: 'Good session',
        completedAt: '2026-04-22',
      });
      expect(result.status).toBe('completed');
      expect(result.overallRpe).toBe(8);
    });

    it('accepts partial status', () => {
      const result = completeSessionSchema.parse({ status: 'partial' });
      expect(result.status).toBe('partial');
    });

    it('accepts skipped status', () => {
      const result = completeSessionSchema.parse({ status: 'skipped' });
      expect(result.status).toBe('skipped');
    });

    it('rejects overallRpe below 1', () => {
      expect(() =>
        completeSessionSchema.parse({ status: 'completed', overallRpe: 0 }),
      ).toThrow();
    });

    it('rejects overallRpe above 10', () => {
      expect(() =>
        completeSessionSchema.parse({ status: 'completed', overallRpe: 11 }),
      ).toThrow();
    });

    it('rejects non-integer actualDurationMinutes', () => {
      expect(() =>
        completeSessionSchema.parse({ status: 'completed', actualDurationMinutes: 45.5 }),
      ).toThrow();
    });

    it('rejects sessionNote exceeding 2000 chars', () => {
      expect(() =>
        completeSessionSchema.parse({ status: 'completed', sessionNote: 'x'.repeat(2001) }),
      ).toThrow();
    });
  });

  // ── listSessionsQuerySchema ──

  describe('listSessionsQuerySchema', () => {
    it('applies defaults', () => {
      const result = listSessionsQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('coerces string numbers', () => {
      const result = listSessionsQuerySchema.parse({ page: '2', limit: '50' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('rejects limit above 100', () => {
      expect(() => listSessionsQuerySchema.parse({ limit: '101' })).toThrow();
    });

    it('accepts optional filters', () => {
      const result = listSessionsQuerySchema.parse({
        playerId: PLAYER_ID,
        status: 'pending',
        from: '2026-04-01',
        to: '2026-04-30',
      });
      expect(result.status).toBe('pending');
      expect(result.from).toBe('2026-04-01');
    });
  });

  // ── updateSessionSchema ──

  describe('updateSessionSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      expect(() => updateSessionSchema.parse({})).not.toThrow();
    });

    it('accepts partial update', () => {
      const result = updateSessionSchema.parse({ sessionType: 'recovery' });
      expect(result.sessionType).toBe('recovery');
    });
  });
});
