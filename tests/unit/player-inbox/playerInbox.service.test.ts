// Top-level mock functions (survive clearAllMocks)
const mockItemFindAndCountAll = jest.fn();
const mockItemFindByPk = jest.fn();
const mockItemCreate = jest.fn();
const mockEventCreate = jest.fn();
const mockPlayerFindByPk = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindOne = jest.fn();

jest.mock('../../../src/modules/player-inbox/playerInbox.model', () => ({
  PlayerInboxItem: {
    getAttributes: jest.fn().mockReturnValue({
      id: {}, playerId: {}, status: {}, title: {}, body: {},
      issuedByUserId: {}, category: {}, priority: {}, staffNotes: {},
    }),
    findAndCountAll: (...a: unknown[]) => mockItemFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockItemFindByPk(...a),
    create: (...a: unknown[]) => mockItemCreate(...a),
    count: jest.fn().mockResolvedValue(0),
    findAll: jest.fn().mockResolvedValue([]),
    belongsTo: jest.fn(),
  },
  PlayerInboxEvent: {
    create: (...a: unknown[]) => mockEventCreate(...a),
  },
}));
jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { findByPk: (...a: unknown[]) => mockPlayerFindByPk(...a) },
}));
jest.mock('../../../src/modules/users/user.model', () => ({
  User: {
    findByPk: (...a: unknown[]) => mockUserFindByPk(...a),
    findOne: (...a: unknown[]) => mockUserFindOne(...a),
  },
}));
jest.mock('../../../src/modules/documents/document.model', () => ({
  Document: {},
}));
jest.mock('../../../src/modules/notifications/notification.service', () => ({
  notifyUser: jest.fn().mockResolvedValue(undefined),
  notifyByRole: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/modules/portal/portal.service', () => ({
  getLinkedPlayer: jest.fn(),
}));
jest.mock('../../../src/shared/utils/rowScope', () => ({
  buildRowScope: jest.fn().mockResolvedValue(null),
  mergeScope: jest.fn(),
  isBypassRole: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../src/shared/utils/pagination', () => ({
  parsePagination: jest.fn().mockReturnValue({
    limit: 20, offset: 0, page: 1, sort: 'created_at', order: 'desc',
  }),
  buildMeta: jest.fn().mockReturnValue({ page: 1, limit: 20, total: 1, totalPages: 1 }),
}));
jest.mock('../../../src/shared/utils/audit', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { debug: jest.fn(), warn: jest.fn() },
}));
jest.mock('../../../src/middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

import {
  listInboxItems,
  getInboxItemById,
  createInboxItem,
  updateInboxItem,
  deleteInboxItem,
} from '../../../src/modules/player-inbox/playerInbox.service';

const mockInstance = (data: Record<string, unknown>) => ({
  ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
});

const mockAuthUser = { id: 'user-1', role: 'Admin' } as never;
const mockCtx = { userId: 'user-1', userRole: 'Admin', ip: '127.0.0.1' } as never;

describe('playerInbox.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockItemFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    mockItemFindByPk.mockResolvedValue(null);
    mockItemCreate.mockResolvedValue({});
    mockEventCreate.mockResolvedValue({});
    mockPlayerFindByPk.mockResolvedValue(null);
    mockUserFindByPk.mockResolvedValue(null);
    mockUserFindOne.mockResolvedValue(null);
  });

  describe('listInboxItems', () => {
    it('returns paginated inbox items', async () => {
      const item = mockInstance({ id: 'i1', playerId: 'p1', status: 'Sent' });
      mockItemFindAndCountAll.mockResolvedValue({ count: 1, rows: [item] });

      const result = await listInboxItems({ page: 1, limit: 20 } as never, mockAuthUser);

      expect(mockItemFindAndCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('applies playerId and category filters', async () => {
      mockItemFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await listInboxItems(
        { page: 1, limit: 20, playerId: 'p1', category: 'fine' } as never,
        mockAuthUser,
      );

      const call = mockItemFindAndCountAll.mock.calls[0][0];
      expect(call.where.playerId).toBe('p1');
      expect(call.where.category).toBe('fine');
    });
  });

  describe('getInboxItemById', () => {
    it('returns an inbox item by id', async () => {
      const item = mockInstance({ id: 'i1', playerId: 'p1', status: 'Sent' });
      mockItemFindByPk.mockResolvedValue(item);

      const result = await getInboxItemById('i1', mockAuthUser);

      expect(mockItemFindByPk).toHaveBeenCalledWith('i1', expect.any(Object));
      expect(result).toEqual(item);
    });

    it('throws 404 when inbox item not found', async () => {
      mockItemFindByPk.mockResolvedValue(null);

      await expect(getInboxItemById('missing', mockAuthUser)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Inbox item not found',
      });
    });
  });

  describe('createInboxItem', () => {
    it('creates an inbox item when player exists', async () => {
      const player = { id: 'p1', firstName: 'Ali', lastName: 'Hassan' };
      mockPlayerFindByPk.mockResolvedValue(player);
      const created = mockInstance({
        id: 'i1',
        playerId: 'p1',
        category: 'fine',
        title: 'Late',
        body: 'Test',
        issuedByUserId: 'user-1',
        priority: 'normal',
        status: 'Sent',
      });
      mockItemCreate.mockResolvedValue(created);
      mockEventCreate.mockResolvedValue({});

      const result = await createInboxItem(
        { playerId: 'p1', category: 'fine', title: 'Late', body: 'Test' } as never,
        'user-1',
        mockCtx,
      );

      expect(mockItemCreate).toHaveBeenCalledTimes(1);
      expect(result).toEqual(created);
    });

    it('throws 404 when player not found', async () => {
      mockPlayerFindByPk.mockResolvedValue(null);

      await expect(
        createInboxItem({ playerId: 'bad' } as never, 'user-1', mockCtx),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Player not found' });
    });
  });

  describe('updateInboxItem', () => {
    it('updates an inbox item', async () => {
      const item = mockInstance({ id: 'i1', status: 'Sent', title: 'Old', playerId: 'p1' });
      mockItemFindByPk.mockResolvedValue(item);

      await updateInboxItem('i1', { title: 'New' } as never, mockAuthUser, mockCtx);

      expect(item.update).toHaveBeenCalled();
    });

    it('throws 422 when item is already Resolved', async () => {
      const item = mockInstance({ id: 'i1', status: 'Resolved', playerId: 'p1' });
      mockItemFindByPk.mockResolvedValue(item);

      await expect(
        updateInboxItem('i1', { title: 'X' } as never, mockAuthUser, mockCtx),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('throws 404 when inbox item not found', async () => {
      mockItemFindByPk.mockResolvedValue(null);

      await expect(
        updateInboxItem('missing', {} as never, mockAuthUser, mockCtx),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deleteInboxItem', () => {
    it('deletes an existing inbox item', async () => {
      const item = mockInstance({ id: 'i1', playerId: 'p1', status: 'Sent' });
      mockItemFindByPk.mockResolvedValue(item);

      const result = await deleteInboxItem('i1', mockAuthUser);

      expect(item.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'i1' });
    });

    it('throws 404 when inbox item not found', async () => {
      mockItemFindByPk.mockResolvedValue(null);

      await expect(deleteInboxItem('missing', mockAuthUser)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
