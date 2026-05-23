/// <reference types="jest" />
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock factories ──

const mockCalendarEventFindAndCountAll = jest.fn();
const mockCalendarEventFindByPk = jest.fn();
const mockCalendarEventCreate = jest.fn();
const mockEventAttendeeDestroy = jest.fn();
const mockEventAttendeeBulkCreate = jest.fn();
const mockSequelizeTransaction = jest.fn();

const mockTransaction = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

// ── Module mocks (must be hoisted before imports) ──

jest.mock('../../../src/config/database', () => ({
  sequelize: {
    transaction: (...a: unknown[]) => mockSequelizeTransaction(...a),
    query: jest.fn(),
    literal: jest.fn((sql: string) => ({ val: sql })),
    authenticate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/calendar/event.model', () => ({
  CalendarEvent: {
    findAndCountAll: (...a: unknown[]) => mockCalendarEventFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockCalendarEventFindByPk(...a),
    create: (...a: unknown[]) => mockCalendarEventCreate(...a),
  },
  EventAttendee: {
    bulkCreate: (...a: unknown[]) => mockEventAttendeeBulkCreate(...a),
    destroy: (...a: unknown[]) => mockEventAttendeeDestroy(...a),
  },
  EVENT_TYPES: ['Training', 'Medical', 'ContractDeadline', 'Meeting', 'Custom'],
  ATTENDEE_TYPES: ['player', 'user'],
  ATTENDEE_STATUSES: ['pending', 'accepted', 'declined'],
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { findByPk: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../../../src/modules/sessions/session.model', () => ({
  Session: { findAll: jest.fn(), findAndCountAll: jest.fn() },
}));

jest.mock('../../../src/modules/matches/match.model', () => ({
  Match: { findAll: jest.fn(), findAndCountAll: jest.fn() },
}));

jest.mock('../../../src/modules/tasks/task.model', () => ({
  Task: { findAll: jest.fn(), findAndCountAll: jest.fn() },
}));

jest.mock('../../../src/modules/referrals/referral.model', () => ({
  Referral: { findAll: jest.fn(), findAndCountAll: jest.fn() },
}));

jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: { findByPk: jest.fn(), findAll: jest.fn() },
}));

jest.mock('../../../src/modules/contracts/contract.model', () => ({
  Contract: { findAll: jest.fn(), findAndCountAll: jest.fn() },
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/modules/calendar/calendarRoleConfig', () => ({
  resolveTypesForRoles: jest.fn().mockReturnValue(['Training', 'Meeting', 'Custom']),
  ALL_TYPES: ['Training', 'Medical', 'ContractDeadline', 'Meeting', 'Custom'],
}));

jest.mock('../../../src/modules/calendar/calendarScope', () => ({}));

// ── Import service under test (after all mocks) ──

import * as calendarService from '../../../src/modules/calendar/event.service';
import type { EventQuery } from '../../../src/modules/calendar/event.validation';

// ── Base query helper ──

const baseQuery = (overrides: Partial<EventQuery> = {}): EventQuery => ({
  page: 1,
  limit: 10,
  sort: 'start_date',
  order: 'asc',
  ...overrides,
});

// ── Test data helpers ──

const mockInstance = (data: Record<string, unknown>) => ({
  ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
});

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 'event-001',
  title: 'Team Meeting',
  titleAr: 'اجتماع الفريق',
  description: null,
  descriptionAr: null,
  eventType: 'Meeting',
  startDate: new Date('2026-06-01T09:00:00Z'),
  endDate: new Date('2026-06-01T10:00:00Z'),
  allDay: false,
  location: 'Main Conference Room',
  locationAr: null,
  color: '#3C3CFA',
  recurrenceRule: null,
  recurrenceParentId: null,
  recurrenceException: false,
  sourceType: null,
  sourceId: null,
  isAutoCreated: false,
  reminderMinutes: 15,
  timezone: 'Asia/Riyadh',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ── Tests ──

describe('Calendar Event Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Safe defaults
    mockSequelizeTransaction.mockResolvedValue(mockTransaction);
    mockCalendarEventFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    mockCalendarEventFindByPk.mockResolvedValue(null);
    mockCalendarEventCreate.mockResolvedValue(mockInstance(makeEvent()));
    mockEventAttendeeBulkCreate.mockResolvedValue([]);
    mockEventAttendeeDestroy.mockResolvedValue(undefined);
  });

  // ── listEvents ──

  describe('listEvents', () => {
    it('should return paginated events — happy path', async () => {
      const event = mockInstance(makeEvent());
      mockCalendarEventFindAndCountAll.mockResolvedValue({ count: 1, rows: [event] });

      const result = await calendarService.listEvents(baseQuery());

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockCalendarEventFindAndCountAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty list when no events exist', async () => {
      mockCalendarEventFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const result = await calendarService.listEvents(baseQuery());

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should apply eventType filter when provided', async () => {
      mockCalendarEventFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await calendarService.listEvents(baseQuery({ eventType: 'Training' }));

      const call = mockCalendarEventFindAndCountAll.mock.calls[0][0];
      expect(call.where).toHaveProperty('eventType', 'Training');
    });

    it('should apply date range filter when both startDate and endDate are provided', async () => {
      mockCalendarEventFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await calendarService.listEvents(baseQuery({ startDate: '2026-06-01', endDate: '2026-06-30' }));

      const call = mockCalendarEventFindAndCountAll.mock.calls[0][0];
      expect(call.where).toHaveProperty('startDate');
      expect(call.where).toHaveProperty('endDate');
    });

    it('should apply search filter when search param is provided', async () => {
      mockCalendarEventFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await calendarService.listEvents(baseQuery({ search: 'meeting' }));

      expect(mockCalendarEventFindAndCountAll).toHaveBeenCalled();
    });

    it('should return correct pagination meta', async () => {
      mockCalendarEventFindAndCountAll.mockResolvedValue({ count: 25, rows: [] });

      const result = await calendarService.listEvents(baseQuery({ page: 2, limit: 10 }));

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(25);
    });
  });

  // ── getEventById ──

  describe('getEventById', () => {
    it('should return event when found', async () => {
      const event = mockInstance(makeEvent());
      mockCalendarEventFindByPk.mockResolvedValue(event);

      const result = await calendarService.getEventById('event-001');

      expect(result).toBeDefined();
      expect(result.id).toBe('event-001');
      expect(mockCalendarEventFindByPk).toHaveBeenCalledWith(
        'event-001',
        expect.objectContaining({ include: expect.any(Array) }),
      );
    });

    it('should throw 404 AppError when event not found', async () => {
      mockCalendarEventFindByPk.mockResolvedValue(null);

      await expect(calendarService.getEventById('nonexistent-id')).rejects.toMatchObject({
        message: 'Event not found',
        statusCode: 404,
      });
    });
  });

  // ── createEvent ──

  describe('createEvent', () => {
    const createInput = {
      title: 'Training Session',
      titleAr: 'جلسة تدريب',
      eventType: 'Training' as const,
      startDate: '2026-06-10T08:00:00Z',
      endDate: '2026-06-10T10:00:00Z',
      allDay: false,
      timezone: 'Asia/Riyadh',
    };

    it('should create event and return it with includes — happy path', async () => {
      const createdEvent = mockInstance(makeEvent({ title: 'Training Session', id: 'event-new' }));
      mockCalendarEventCreate.mockResolvedValue(createdEvent);
      // getEventById is called internally after create — also needs findByPk to resolve
      mockCalendarEventFindByPk.mockResolvedValue(createdEvent);

      const result = await calendarService.createEvent(createInput, 'user-001');

      expect(result).toBeDefined();
      expect(mockCalendarEventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Training Session',
          createdBy: 'user-001',
        }),
        expect.objectContaining({ transaction: mockTransaction }),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should rollback transaction and re-throw on error', async () => {
      mockCalendarEventCreate.mockRejectedValue(new Error('DB error'));

      await expect(calendarService.createEvent(createInput, 'user-001')).rejects.toThrow('DB error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should bulk-create attendees when attendees are provided', async () => {
      const createdEvent = mockInstance(makeEvent({ id: 'event-new' }));
      mockCalendarEventCreate.mockResolvedValue(createdEvent);
      mockCalendarEventFindByPk.mockResolvedValue(createdEvent);

      await calendarService.createEvent(
        {
          ...createInput,
          attendees: [
            { type: 'user', id: 'user-002' },
            { type: 'player', id: 'player-001' },
          ],
        },
        'user-001',
      );

      expect(mockEventAttendeeBulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ attendeeType: 'user', attendeeId: 'user-002' }),
          expect.objectContaining({ attendeeType: 'player', attendeeId: 'player-001' }),
        ]),
        expect.objectContaining({ transaction: mockTransaction }),
      );
    });

    it('should NOT call bulkCreate when no attendees are provided', async () => {
      const createdEvent = mockInstance(makeEvent({ id: 'event-new' }));
      mockCalendarEventCreate.mockResolvedValue(createdEvent);
      mockCalendarEventFindByPk.mockResolvedValue(createdEvent);

      await calendarService.createEvent(createInput, 'user-001');

      expect(mockEventAttendeeBulkCreate).not.toHaveBeenCalled();
    });
  });

  // ── updateEvent ──

  describe('updateEvent', () => {
    it('should update event and return refreshed record — happy path', async () => {
      const event = mockInstance(makeEvent());
      // findOrThrow → findByPk (first call = the update find; second call = getEventById after)
      mockCalendarEventFindByPk
        .mockResolvedValueOnce(event)   // findOrThrow inside updateEvent
        .mockResolvedValueOnce(event);  // getEventById at the end

      const result = await calendarService.updateEvent('event-001', {
        title: 'Updated Title',
      });

      expect(result).toBeDefined();
      expect(event.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Title' }),
        expect.objectContaining({ transaction: mockTransaction }),
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should throw 404 when event not found', async () => {
      mockCalendarEventFindByPk.mockResolvedValue(null);

      await expect(
        calendarService.updateEvent('nonexistent-id', { title: 'x' }),
      ).rejects.toMatchObject({
        message: 'Event not found',
        statusCode: 404,
      });
    });

    it('should replace attendees when attendees array is included in update', async () => {
      const event = mockInstance(makeEvent());
      mockCalendarEventFindByPk
        .mockResolvedValueOnce(event)
        .mockResolvedValueOnce(event);

      await calendarService.updateEvent('event-001', {
        title: 'Updated',
        attendees: [{ type: 'user', id: 'user-003' }],
      });

      // Existing attendees should be destroyed first
      expect(mockEventAttendeeDestroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { eventId: 'event-001' } }),
      );
      // New attendees should be created
      expect(mockEventAttendeeBulkCreate).toHaveBeenCalled();
    });

    it('should rollback transaction and re-throw on error', async () => {
      const event = mockInstance(makeEvent());
      event.update = jest.fn().mockRejectedValue(new Error('Update failed'));
      mockCalendarEventFindByPk.mockResolvedValue(event);

      await expect(
        calendarService.updateEvent('event-001', { title: 'fail' }),
      ).rejects.toThrow('Update failed');

      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ── deleteEvent ──

  describe('deleteEvent', () => {
    it('should delete event and return { id } — happy path', async () => {
      const event = mockInstance(makeEvent({ id: 'event-001' }));
      mockCalendarEventFindByPk.mockResolvedValue(event);

      const result = await calendarService.deleteEvent('event-001');

      expect(result).toEqual({ id: 'event-001' });
      expect(event.destroy).toHaveBeenCalled();
    });

    it('should throw 404 when event not found', async () => {
      mockCalendarEventFindByPk.mockResolvedValue(null);

      await expect(calendarService.deleteEvent('nonexistent-id')).rejects.toMatchObject({
        message: 'Event not found',
        statusCode: 404,
      });
    });
  });

  // TODO: getAggregatedEvents is intentionally skipped.
  // It queries 6 external sources (CalendarEvent, Session, Match, Task, Referral, Contract)
  // with complex scope-based visibility logic. It should be tested in a dedicated
  // integration test against a real (test) database or with a heavy fixture setup.
});
