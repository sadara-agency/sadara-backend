/// <reference types="jest" />
import { mockPlayer, mockModelInstance } from '../../setup/test-helpers';

const mockSessionFindAndCountAll = jest.fn();
const mockSessionFindByPk = jest.fn();
const mockSessionCreate = jest.fn();

const mockPlayerFindByPk = jest.fn();
const mockReferralFindByPk = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn().mockResolvedValue([]), authenticate: jest.fn() },
}));

jest.mock('../../../src/shared/utils/displayId', () => ({
  generateDisplayId: jest.fn().mockResolvedValue('SES-26-0001'),
}));

jest.mock('../../../src/modules/sessions/session.model', () => ({
  Session: {
    findAndCountAll: (...a: unknown[]) => mockSessionFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockSessionFindByPk(...a),
    create: (...a: unknown[]) => mockSessionCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a), name: 'Player' },
}));
jest.mock('../../../src/modules/referrals/referral.model', () => ({
  Referral: { findByPk: (...a: unknown[]) => mockReferralFindByPk(...a), name: 'Referral' },
}));
jest.mock('../../../src/modules/users/user.model', () => ({
  User: { findByPk: jest.fn(), name: 'User' },
}));
jest.mock('../../../src/modules/journey/journey.model', () => ({
  Journey: { findByPk: jest.fn(), name: 'Journey' },
}));
jest.mock('../../../src/modules/tickets/ticket.model', () => ({
  Ticket: { findByPk: jest.fn(), name: 'Ticket' },
}));
jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: { findByPk: jest.fn(), name: 'Match' },
}));

jest.mock('../../../src/modules/calendar/calendarScope', () => ({
  upsertSourceAttendees: jest.fn(),
  evictCalendarScope: jest.fn().mockResolvedValue(undefined),
}));

import * as sessionService from '../../../src/modules/sessions/session.service';

const mockSession = (overrides: Record<string, any> = {}) => ({
  id: 'session-001',
  playerId: 'player-001',
  referralId: 'referral-001',
  sessionType: 'Physical',
  programOwner: 'FitnessCoach',
  responsibleId: null,
  sessionDate: '2026-04-10',
  notes: null,
  notesAr: null,
  completionStatus: 'Scheduled',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Session Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listSessions', () => {
    it('should return paginated sessions', async () => {
      mockSessionFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const result = await sessionService.listSessions({ page: 1, limit: 20, sort: 'session_date', order: 'desc' } as any);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should apply filters', async () => {
      mockSessionFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await sessionService.listSessions({
        page: 1, limit: 10, sort: 'session_date', order: 'desc',
        playerId: 'p1', sessionType: 'Mental', programOwner: 'MentalCoach',
      } as any);
      const call = mockSessionFindAndCountAll.mock.calls[0][0];
      expect(call.where.playerId).toBe('p1');
      expect(call.where.sessionType).toBe('Mental');
      expect(call.where.programOwner).toBe('MentalCoach');
    });

    it('should filter by matchId', async () => {
      mockSessionFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      await sessionService.listSessions({
        page: 1, limit: 10, sort: 'session_date', order: 'desc',
        matchId: 'match-001',
      } as any);
      const call = mockSessionFindAndCountAll.mock.calls[0][0];
      expect(call.where.matchId).toBe('match-001');
    });
  });

  describe('getSessionById', () => {
    it('should return session', async () => {
      mockSessionFindByPk.mockResolvedValue(mockSession());
      const result = await sessionService.getSessionById('session-001');
      expect(result.id).toBe('session-001');
    });

    it('should throw 404 if not found', async () => {
      mockSessionFindByPk.mockResolvedValue(null);
      await expect(sessionService.getSessionById('bad-id')).rejects.toThrow('Session not found');
    });
  });

  describe('createSession', () => {
    it('should create session linked to referral', async () => {
      const player = mockModelInstance(mockPlayer());
      mockPlayerFindByPk.mockResolvedValue(player);
      const referral = mockModelInstance({ id: 'referral-001', playerId: 'player-001' });
      mockReferralFindByPk.mockResolvedValue(referral);
      const created = mockSession();
      mockSessionCreate.mockResolvedValue(created);
      mockSessionFindByPk.mockResolvedValue(created);

      await sessionService.createSession({
        playerId: 'player-001',
        referralId: 'referral-001',
        sessionType: 'Physical',
        programOwner: 'FitnessCoach',
        sessionDate: '2026-04-10',
      } as any, 'user-001');

      expect(mockSessionCreate).toHaveBeenCalled();
      // sessionCount is computed at read time — no manual increment.
      expect(referral.increment).not.toHaveBeenCalled();
    });

    it('should throw if player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);
      await expect(
        sessionService.createSession({
          playerId: 'bad', referralId: 'r1',
          sessionType: 'Physical', programOwner: 'FitnessCoach', sessionDate: '2026-04-10',
        } as any, 'user-001'),
      ).rejects.toThrow();
    });
  });

  describe('deleteSession', () => {
    it('should delete the session', async () => {
      const session = mockModelInstance(mockSession());
      mockSessionFindByPk.mockResolvedValue(session);
      const referral = mockModelInstance({ id: 'referral-001' });
      mockReferralFindByPk.mockResolvedValue(referral);

      const result = await sessionService.deleteSession('session-001');
      expect(session.destroy).toHaveBeenCalled();
      // sessionCount is computed at read time — no manual decrement.
      expect(referral.decrement).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'session-001' });
    });

    it('should throw 404 if not found', async () => {
      mockSessionFindByPk.mockResolvedValue(null);
      await expect(sessionService.deleteSession('bad-id')).rejects.toThrow('Session not found');
    });
  });

  describe('getSessionStats', () => {
    it('should return aggregate stats', async () => {
      const result = await sessionService.getSessionStats();
      expect(result).toHaveProperty('byType');
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byOwner');
    });
  });
});
