import { UniqueConstraintError } from 'sequelize';

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockClubFindByPk = jest.fn();
const mockWindowFindByPk = jest.fn();

jest.mock('../../../src/modules/club-needs/clubNeed.model', () => ({
  __esModule: true,
  default: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));
jest.mock('../../../src/modules/clubs/club.model', () => ({
  Club: {
    findByPk: (...a: unknown[]) => mockClubFindByPk(...a),
  },
}));
jest.mock('../../../src/modules/transfer-windows/transferWindow.model', () => ({
  __esModule: true,
  default: {
    findByPk: (...a: unknown[]) => mockWindowFindByPk(...a),
  },
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
jest.mock('../../../src/shared/utils/pagination', () => ({
  parsePagination: jest.fn().mockReturnValue({
    limit: 20,
    offset: 0,
    page: 1,
    sort: 'priority',
    order: 'asc',
  }),
  buildMeta: jest.fn().mockReturnValue({ page: 1, limit: 20, total: 1, totalPages: 1 }),
}));

import {
  listClubNeeds,
  getClubNeedById,
  createClubNeed,
  updateClubNeed,
  deleteClubNeed,
} from '../../../src/modules/club-needs/clubNeed.service';

const mockInstance = (data: Record<string, unknown>) => ({
  ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
});

describe('clubNeed.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    mockFindByPk.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});
    mockClubFindByPk.mockResolvedValue({ id: 'club-1' });
    mockWindowFindByPk.mockResolvedValue({ id: 'window-1' });
  });

  describe('listClubNeeds', () => {
    it('returns paginated club needs', async () => {
      const need = mockInstance({ id: 'n1', position: 'Striker' });
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [need] });

      const result = await listClubNeeds({ page: 1, limit: 20 } as never);

      expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('applies windowId and clubId filters', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await listClubNeeds({ page: 1, limit: 20, windowId: 'w1', clubId: 'c1' } as never);

      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where.windowId).toBe('w1');
      expect(call.where.clubId).toBe('c1');
    });
  });

  describe('getClubNeedById', () => {
    it('returns a club need by id', async () => {
      const need = mockInstance({ id: 'n1', position: 'GK' });
      mockFindByPk.mockResolvedValue(need);

      const result = await getClubNeedById('n1');

      expect(mockFindByPk).toHaveBeenCalledWith('n1', expect.any(Object));
      expect(result).toEqual(need);
    });

    it('throws 404 when club need not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(getClubNeedById('missing')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Club need not found',
      });
    });
  });

  describe('createClubNeed', () => {
    it('creates a club need when club and window exist', async () => {
      const created = mockInstance({ id: 'n1', position: 'Striker' });
      mockCreate.mockResolvedValue(created);

      const result = await createClubNeed(
        { clubId: 'club-1', windowId: 'window-1', position: 'Striker' } as never,
        'user-1',
      );

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(result).toEqual(created);
    });

    it('throws 404 when club not found', async () => {
      mockClubFindByPk.mockResolvedValue(null);

      await expect(
        createClubNeed({ clubId: 'bad', windowId: 'window-1' } as never, 'user-1'),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Club not found' });
    });

    it('throws 404 when transfer window not found', async () => {
      mockWindowFindByPk.mockResolvedValue(null);

      await expect(
        createClubNeed({ clubId: 'club-1', windowId: 'bad' } as never, 'user-1'),
      ).rejects.toMatchObject({ statusCode: 404, message: 'Transfer window not found' });
    });

    it('throws 409 on unique constraint violation', async () => {
      mockCreate.mockRejectedValue(
        new UniqueConstraintError({ message: 'dup', errors: [] }),
      );

      await expect(
        createClubNeed({ clubId: 'club-1', windowId: 'window-1' } as never, 'user-1'),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('updateClubNeed', () => {
    it('updates an existing club need', async () => {
      const need = mockInstance({ id: 'n1', position: 'CB' });
      mockFindByPk.mockResolvedValue(need);

      const result = await updateClubNeed('n1', { position: 'CB' } as never);

      expect(need.update).toHaveBeenCalledWith({ position: 'CB' });
      expect(result).toBeDefined();
    });

    it('throws 404 when updating non-existent club need', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(updateClubNeed('missing', {} as never)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('deleteClubNeed', () => {
    it('deletes an existing club need', async () => {
      const need = mockInstance({ id: 'n1' });
      mockFindByPk.mockResolvedValue(need);

      const result = await deleteClubNeed('n1');

      expect(need.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'n1' });
    });

    it('throws 404 when deleting non-existent club need', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(deleteClubNeed('missing')).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
