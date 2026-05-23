const mockFindAndCountAll = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../src/modules/personal-notes/personal-note.model', () => ({
  __esModule: true,
  default: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockCreate(...a),
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

import {
  listPersonalNotes,
  getPersonalNoteById,
  createPersonalNote,
  updatePersonalNote,
  deletePersonalNote,
} from '../../../src/modules/personal-notes/personal-note.service';

const mockInstance = (data: Record<string, unknown>) => ({
  ...data,
  update: jest.fn().mockResolvedValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
});

describe('personal-note.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});
  });

  describe('listPersonalNotes', () => {
    it('returns paginated notes for the user', async () => {
      const note = mockInstance({ id: 'note-1', title: 'My note', userId: 'u1' });
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [note] });

      const result = await listPersonalNotes('u1', { page: 1, limit: 20 } as never);

      expect(mockFindAndCountAll).toHaveBeenCalledTimes(1);
      const call = mockFindAndCountAll.mock.calls[0][0];
      expect(call.where.userId).toBe('u1');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('applies search filter via Op.or', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await listPersonalNotes('u1', { page: 1, limit: 20, search: 'hello' } as never);

      const call = mockFindAndCountAll.mock.calls[0][0];
      // Op.or is a Symbol key present when search is provided
      expect(Object.getOwnPropertySymbols(call.where).length).toBeGreaterThan(0);
    });
  });

  describe('getPersonalNoteById', () => {
    it('returns a note by id for the owner', async () => {
      const note = mockInstance({ id: 'note-1', userId: 'u1' });
      mockFindOne.mockResolvedValue(note);

      const result = await getPersonalNoteById('note-1', 'u1');

      expect(mockFindOne).toHaveBeenCalledWith({ where: { id: 'note-1', userId: 'u1' } });
      expect(result).toEqual(note);
    });

    it('throws 404 when note not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(getPersonalNoteById('missing', 'u1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Note not found',
      });
    });
  });

  describe('createPersonalNote', () => {
    it('creates a note for the user', async () => {
      const created = mockInstance({ id: 'note-1', title: 'New note', userId: 'u1' });
      mockCreate.mockResolvedValue(created);

      const result = await createPersonalNote({ title: 'New note', body: 'body' } as never, 'u1');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New note', userId: 'u1' }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('updatePersonalNote', () => {
    it('updates an existing note', async () => {
      const note = mockInstance({ id: 'note-1', title: 'Old', userId: 'u1' });
      mockFindOne.mockResolvedValue(note);

      const result = await updatePersonalNote('note-1', { title: 'New' } as never, 'u1');

      expect(note.update).toHaveBeenCalledWith({ title: 'New' });
      expect(result).toBeDefined();
    });

    it('throws 404 when note not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(
        updatePersonalNote('missing', { title: 'X' } as never, 'u1'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('deletePersonalNote', () => {
    it('deletes an existing note', async () => {
      const note = mockInstance({ id: 'note-1', userId: 'u1' });
      mockFindOne.mockResolvedValue(note);

      const result = await deletePersonalNote('note-1', 'u1');

      expect(note.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'note-1' });
    });

    it('throws 404 when note not found', async () => {
      mockFindOne.mockResolvedValue(null);

      await expect(deletePersonalNote('missing', 'u1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
