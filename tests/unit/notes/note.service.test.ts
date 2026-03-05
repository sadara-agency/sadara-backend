/// <reference types="jest" />
import { mockNote, mockModelInstance } from '../../setup/test-helpers';

const mockNoteFindAndCountAll = jest.fn();
const mockNoteFindByPk = jest.fn();
const mockNoteCreate = jest.fn();
const mockSequelizeQuery = jest.fn();

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: (...a: unknown[]) => mockSequelizeQuery(...a), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/notes/note.model', () => ({
  Note: {
    findAndCountAll: (...a: unknown[]) => mockNoteFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockNoteFindByPk(...a),
    create: (...a: unknown[]) => mockNoteCreate(...a),
  },
  NoteOwnerType: {},
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as noteService from '../../../src/modules/notes/note.service';

describe('Note Service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('listNotes', () => {
    it('should return paginated notes with author enrichment', async () => {
      const note = mockModelInstance(mockNote());
      mockNoteFindAndCountAll.mockResolvedValue({ count: 1, rows: [note] });
      mockSequelizeQuery.mockResolvedValue([{ id: 'note-001', content: 'Test', author_name: 'Admin' }]);
      const result = await noteService.listNotes({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(mockSequelizeQuery).toHaveBeenCalled();
    });

    it('should return empty when no notes found', async () => {
      mockNoteFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const result = await noteService.listNotes({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(0);
    });

    it('should filter by ownerType', async () => {
      mockNoteFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await noteService.listNotes({ ownerType: 'Player', page: 1, limit: 10 });
      expect(mockNoteFindAndCountAll).toHaveBeenCalled();
    });

    it('should filter by ownerId', async () => {
      mockNoteFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await noteService.listNotes({ ownerId: 'player-001', page: 1, limit: 10 });
      expect(mockNoteFindAndCountAll).toHaveBeenCalled();
    });
  });

  describe('createNote', () => {
    it('should create a note', async () => {
      mockNoteCreate.mockResolvedValue(mockModelInstance(mockNote()));
      const result = await noteService.createNote({ ownerType: 'Player' as any, ownerId: 'player-001', content: 'Test note' }, 'user-001');
      expect(result).toBeDefined();
      expect(mockNoteCreate).toHaveBeenCalledWith(expect.objectContaining({ content: 'Test note', createdBy: 'user-001' }));
    });
  });

  describe('updateNote', () => {
    it('should update own note', async () => {
      const note = mockModelInstance(mockNote({ createdBy: 'user-001' }));
      mockNoteFindByPk.mockResolvedValue(note);
      await noteService.updateNote('note-001', 'Updated content', 'user-001');
      expect(note.update).toHaveBeenCalledWith({ content: 'Updated content' });
    });

    it('should throw 404 if not found', async () => {
      mockNoteFindByPk.mockResolvedValue(null);
      await expect(noteService.updateNote('bad', 'x', 'user-001')).rejects.toThrow('Note not found');
    });

    it('should throw 403 if not owner', async () => {
      const note = mockModelInstance(mockNote({ createdBy: 'user-002' }));
      mockNoteFindByPk.mockResolvedValue(note);
      await expect(noteService.updateNote('note-001', 'x', 'user-001')).rejects.toThrow('You can only edit your own notes');
    });
  });

  describe('deleteNote', () => {
    it('should delete own note', async () => {
      const note = mockModelInstance(mockNote({ createdBy: 'user-001' }));
      mockNoteFindByPk.mockResolvedValue(note);
      const result = await noteService.deleteNote('note-001', 'user-001', 'Analyst');
      expect(note.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'note-001' });
    });

    it('should allow Admin to delete any note', async () => {
      const note = mockModelInstance(mockNote({ createdBy: 'user-002' }));
      mockNoteFindByPk.mockResolvedValue(note);
      const result = await noteService.deleteNote('note-001', 'user-001', 'Admin');
      expect(note.destroy).toHaveBeenCalled();
    });

    it('should throw 403 if non-admin deletes other user note', async () => {
      const note = mockModelInstance(mockNote({ createdBy: 'user-002' }));
      mockNoteFindByPk.mockResolvedValue(note);
      await expect(noteService.deleteNote('note-001', 'user-001', 'Analyst')).rejects.toThrow('You can only delete your own notes');
    });

    it('should throw 404 if not found', async () => {
      mockNoteFindByPk.mockResolvedValue(null);
      await expect(noteService.deleteNote('bad', 'user-001', 'Admin')).rejects.toThrow('Note not found');
    });
  });
});
