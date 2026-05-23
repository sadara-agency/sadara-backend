const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockUploadFile = jest.fn();
const mockResolveFileUrl = jest.fn();

jest.mock('../../../src/modules/voice-memos/voice-memo.model', () => ({
  VoiceMemo: {
    findAll: (...a: unknown[]) => mockFindAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));
jest.mock('../../../src/shared/utils/storage', () => ({
  uploadFile: (...a: unknown[]) => mockUploadFile(...a),
  resolveFileUrl: (...a: unknown[]) => mockResolveFileUrl(...a),
}));
jest.mock('../../../src/config/logger', () => ({
  logger: { warn: jest.fn() },
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
  listVoiceMemos,
  createVoiceMemo,
  deleteVoiceMemo,
} from '../../../src/modules/voice-memos/voice-memo.service';

const mockMemoInstance = (data: Record<string, unknown>) => ({
  ...data,
  toJSON: jest.fn().mockReturnValue({ ...data }),
  destroy: jest.fn().mockResolvedValue(undefined),
});

describe('voice-memo.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue([]);
    mockFindByPk.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});
    mockResolveFileUrl.mockResolvedValue('https://cdn.example.com/voice.m4a');
    mockUploadFile.mockResolvedValue({
      key: 'voice-memos/voice.m4a',
      size: 12345,
      mimeType: 'audio/m4a',
    });
  });

  describe('listVoiceMemos', () => {
    it('returns memos with resolved signed URLs', async () => {
      const memo = mockMemoInstance({
        id: 'vm1',
        ownerType: 'player',
        ownerId: 'p1',
        fileUrl: 'voice-memos/voice.m4a',
        fileSize: 12345,
        mimeType: 'audio/m4a',
        durationSeconds: 30,
        recordedBy: 'user-1',
        createdAt: new Date(),
      });
      mockFindAll.mockResolvedValue([memo]);
      mockResolveFileUrl.mockResolvedValue('https://cdn.example.com/voice.m4a');

      const result = await listVoiceMemos('player', 'p1');

      expect(mockFindAll).toHaveBeenCalledWith({
        where: { ownerType: 'player', ownerId: 'p1' },
        order: [['createdAt', 'DESC']],
      });
      expect(result).toHaveLength(1);
      expect(result[0].fileUrl).toBe('https://cdn.example.com/voice.m4a');
    });

    it('returns empty array when no memos exist', async () => {
      mockFindAll.mockResolvedValue([]);

      const result = await listVoiceMemos('player', 'p-none');

      expect(result).toEqual([]);
    });
  });

  describe('createVoiceMemo', () => {
    it('creates a voice memo and returns resolved URL', async () => {
      const created = mockMemoInstance({
        id: 'vm1',
        ownerType: 'player',
        ownerId: 'p1',
        fileUrl: 'voice-memos/voice.m4a',
        fileSize: 12345,
        mimeType: 'audio/m4a',
        durationSeconds: 30,
        recordedBy: 'user-1',
      });
      mockCreate.mockResolvedValue(created);

      const result = await createVoiceMemo(
        'player',
        'p1',
        30,
        { buffer: Buffer.from('test'), originalname: 'voice.m4a', mimetype: 'audio/m4a' },
        'user-1',
      );

      expect(mockUploadFile).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(result.fileUrl).toBe('https://cdn.example.com/voice.m4a');
    });

    it('throws 400 when duration exceeds 5 minutes', async () => {
      await expect(
        createVoiceMemo(
          'player',
          'p1',
          301,
          { buffer: Buffer.from('x'), originalname: 'v.m4a', mimetype: 'audio/m4a' },
          'user-1',
        ),
      ).rejects.toMatchObject({ statusCode: 400, message: 'Voice memo cannot exceed 5 minutes' });

      expect(mockUploadFile).not.toHaveBeenCalled();
    });
  });

  describe('deleteVoiceMemo', () => {
    it('deletes a memo owned by the user', async () => {
      const memo = mockMemoInstance({ id: 'vm1', recordedBy: 'user-1' });
      mockFindByPk.mockResolvedValue(memo);

      const result = await deleteVoiceMemo('vm1', 'user-1');

      expect(memo.destroy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'vm1' });
    });

    it('throws 403 when user does not own the memo', async () => {
      const memo = mockMemoInstance({ id: 'vm1', recordedBy: 'other-user' });
      mockFindByPk.mockResolvedValue(memo);

      await expect(deleteVoiceMemo('vm1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('throws 404 when memo not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(deleteVoiceMemo('missing', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Voice memo not found',
      });
    });
  });
});
