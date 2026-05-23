/// <reference types="jest" />
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock factories ──
const mockTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 'ticket-001',
  displayId: 'TKT-001',
  playerId: 'player-001',
  matchId: null,
  journeyStageId: null,
  referralId: null,
  title: 'Test Ticket',
  titleAr: 'تذكرة اختبار',
  description: 'Test description',
  ticketType: 'General',
  priority: 'medium',
  status: 'Open',
  assignedTo: 'user-001',
  additionalAssignees: null,
  dueDate: null,
  closureDate: null,
  completedAt: null,
  notes: null,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ── Ticket model mocks ──
const mockTicketFindAndCountAll = jest.fn();
const mockTicketFindByPk = jest.fn();
const mockTicketFindAll = jest.fn();
const mockTicketCreate = jest.fn();

// ── Dependency mocks (must be declared before imports) ──
jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/tickets/ticket.model', () => ({
  Ticket: {
    findAndCountAll: (...a: unknown[]) => mockTicketFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockTicketFindByPk(...a),
    findAll: (...a: unknown[]) => mockTicketFindAll(...a),
    create: (...a: unknown[]) => mockTicketCreate(...a),
    sequelize: {
      literal: (sql: string) => ({ val: sql }),
      fn: jest.fn(),
      col: jest.fn(),
    },
  },
}));

jest.mock('../../../src/shared/utils/displayId', () => ({
  generateDisplayId: jest.fn().mockResolvedValue('TKT-001'),
}));

jest.mock('../../../src/shared/utils/rowScope', () => ({
  buildRowScope: jest.fn().mockResolvedValue(null),
  mergeScope: jest.fn(),
  checkRowAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as ticketService from '../../../src/modules/tickets/ticket.service';
import { generateDisplayId } from '../../../src/shared/utils/displayId';
import { checkRowAccess } from '../../../src/shared/utils/rowScope';

const mockGenerateDisplayId = generateDisplayId as jest.Mock;
const mockCheckRowAccess = checkRowAccess as jest.Mock;

// ── Default query ──
const defaultQuery = {
  page: 1,
  limit: 10,
  sort: 'created_at' as const,
  order: 'desc' as const,
};

describe('Ticket Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateDisplayId.mockResolvedValue('TKT-001');
    mockCheckRowAccess.mockResolvedValue(true);
  });

  // ── listTickets ──
  describe('listTickets', () => {
    it('should return paginated tickets', async () => {
      mockTicketFindAndCountAll.mockResolvedValue({
        count: 2,
        rows: [mockModelInstance(mockTicket()), mockModelInstance(mockTicket({ id: 'ticket-002' }))],
      });

      const result = await ticketService.listTickets(defaultQuery);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
      expect(mockTicketFindAndCountAll).toHaveBeenCalledTimes(1);
    });

    it('should filter by status when provided', async () => {
      mockTicketFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await ticketService.listTickets({ ...defaultQuery, status: 'InProgress' });

      expect(mockTicketFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'InProgress' }),
        }),
      );
    });

    it('should filter by playerId when provided', async () => {
      mockTicketFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await ticketService.listTickets({ ...defaultQuery, playerId: 'player-001' });

      expect(mockTicketFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ playerId: 'player-001' }),
        }),
      );
    });

    it('should filter by priority when provided', async () => {
      mockTicketFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await ticketService.listTickets({ ...defaultQuery, priority: 'urgent' });

      expect(mockTicketFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ priority: 'urgent' }),
        }),
      );
    });

    it('should apply camelCase conversion to sort field from snake_case', async () => {
      mockTicketFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await ticketService.listTickets({ ...defaultQuery, sort: 'due_date', order: 'asc' });

      expect(mockTicketFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['dueDate', 'asc']],
        }),
      );
    });

    it('should calculate correct pagination meta', async () => {
      mockTicketFindAndCountAll.mockResolvedValue({ count: 25, rows: [] });

      const result = await ticketService.listTickets({ ...defaultQuery, page: 2, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.page).toBe(2);
    });
  });

  // ── getTicketById ──
  describe('getTicketById', () => {
    it('should return a ticket when found and access is allowed', async () => {
      const ticket = mockModelInstance(mockTicket());
      mockTicketFindByPk.mockResolvedValue(ticket);
      mockCheckRowAccess.mockResolvedValue(true);

      const result = await ticketService.getTicketById('ticket-001');

      expect(result).toBeDefined();
      expect(result.id).toBe('ticket-001');
      expect(mockTicketFindByPk).toHaveBeenCalledWith('ticket-001');
    });

    it('should throw 404 when ticket is not found', async () => {
      mockTicketFindByPk.mockResolvedValue(null);

      await expect(ticketService.getTicketById('nonexistent')).rejects.toThrow('Ticket not found');
    });

    it('should throw 404 when row access is denied', async () => {
      const ticket = mockModelInstance(mockTicket());
      mockTicketFindByPk.mockResolvedValue(ticket);
      mockCheckRowAccess.mockResolvedValue(false);

      await expect(ticketService.getTicketById('ticket-001')).rejects.toThrow('Ticket not found');
    });
  });

  // ── createTicket ──
  describe('createTicket', () => {
    const createPayload = {
      title: 'New Ticket',
      titleAr: 'تذكرة جديدة',
      ticketType: 'General' as const,
      priority: 'medium' as const,
      status: 'Open' as const,
    };

    it('should create a ticket with a generated displayId', async () => {
      const created = mockModelInstance(mockTicket({ displayId: 'TKT-001' }));
      mockTicketCreate.mockResolvedValue(created);
      mockGenerateDisplayId.mockResolvedValue('TKT-001');

      const result = await ticketService.createTicket(createPayload, 'user-001');

      expect(mockGenerateDisplayId).toHaveBeenCalledWith('tickets');
      expect(mockTicketCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          displayId: 'TKT-001',
          createdBy: 'user-001',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should pass all payload fields to Ticket.create', async () => {
      const created = mockModelInstance(mockTicket());
      mockTicketCreate.mockResolvedValue(created);

      await ticketService.createTicket(createPayload, 'user-001');

      expect(mockTicketCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Ticket',
          titleAr: 'تذكرة جديدة',
          createdBy: 'user-001',
        }),
      );
    });
  });

  // ── updateTicketStatus ──
  describe('updateTicketStatus', () => {
    it('should update status to InProgress', async () => {
      const ticket = mockModelInstance(mockTicket({ status: 'Open' }));
      mockTicketFindByPk.mockResolvedValue(ticket);

      await ticketService.updateTicketStatus('ticket-001', 'InProgress');

      expect(ticket.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'InProgress' }));
    });

    it('should set completedAt and closureDate when status becomes Completed', async () => {
      const ticket = mockModelInstance(mockTicket({ status: 'Open' }));
      mockTicketFindByPk.mockResolvedValue(ticket);

      await ticketService.updateTicketStatus('ticket-001', 'Completed');

      expect(ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Completed',
          completedAt: expect.any(Date),
          closureDate: expect.any(String),
        }),
      );
    });

    it('should clear completedAt and closureDate when reopening a completed ticket', async () => {
      const ticket = mockModelInstance(mockTicket({ status: 'Completed' }));
      mockTicketFindByPk.mockResolvedValue(ticket);

      await ticketService.updateTicketStatus('ticket-001', 'InProgress');

      expect(ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'InProgress',
          completedAt: null,
          closureDate: null,
        }),
      );
    });

    it('should throw 404 when ticket is not found', async () => {
      mockTicketFindByPk.mockResolvedValue(null);

      await expect(ticketService.updateTicketStatus('nonexistent', 'InProgress')).rejects.toThrow(
        'Ticket not found',
      );
    });
  });

  // ── updateTicket ──
  describe('updateTicket', () => {
    it('should update ticket fields', async () => {
      const ticket = mockModelInstance(mockTicket({ status: 'Open' }));
      mockTicketFindByPk.mockResolvedValue(ticket);

      await ticketService.updateTicket('ticket-001', { title: 'Updated Title' });

      expect(ticket.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Title' }));
    });

    it('should auto-set completedAt when transitioning to Completed', async () => {
      const ticket = mockModelInstance(mockTicket({ status: 'Open' }));
      mockTicketFindByPk.mockResolvedValue(ticket);

      await ticketService.updateTicket('ticket-001', { status: 'Completed' });

      expect(ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Completed',
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should throw 404 when ticket not found', async () => {
      mockTicketFindByPk.mockResolvedValue(null);

      await expect(ticketService.updateTicket('nonexistent', { title: 'X' })).rejects.toThrow(
        'Ticket not found',
      );
    });
  });

  // ── deleteTicket ──
  describe('deleteTicket', () => {
    it('should delete a ticket and return it', async () => {
      const ticket = mockModelInstance(mockTicket());
      mockTicketFindByPk.mockResolvedValue(ticket);

      const result = await ticketService.deleteTicket('ticket-001');

      expect(ticket.destroy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw 404 when ticket not found', async () => {
      mockTicketFindByPk.mockResolvedValue(null);

      await expect(ticketService.deleteTicket('nonexistent')).rejects.toThrow('Ticket not found');
    });
  });

  // ── getOpenTicketsByPlayer ──
  describe('getOpenTicketsByPlayer', () => {
    it('should return open ticket counts grouped by player', async () => {
      mockTicketFindAll.mockResolvedValue([
        { playerId: 'player-001', openCount: 3, urgentCount: 1 },
        { playerId: 'player-002', openCount: 1, urgentCount: 0 },
      ]);

      const result = await ticketService.getOpenTicketsByPlayer();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('playerId', 'player-001');
      expect(result[0]).toHaveProperty('openCount', 3);
      expect(result[0]).toHaveProperty('urgentCount', 1);
      expect(mockTicketFindAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no open tickets exist', async () => {
      mockTicketFindAll.mockResolvedValue([]);

      const result = await ticketService.getOpenTicketsByPlayer();

      expect(result).toHaveLength(0);
    });
  });
});
