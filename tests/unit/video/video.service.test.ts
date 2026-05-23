/// <reference types="jest" />
import { mockModelInstance } from '../../setup/test-helpers';

// ── Mock fns ──

const mockClipFindAndCountAll = jest.fn();
const mockClipFindByPk = jest.fn();
const mockClipCreate = jest.fn();

const mockTagFindAll = jest.fn();
const mockTagFindByPk = jest.fn();
const mockTagCreate = jest.fn();

const mockUploadFile = jest.fn();

// ── Module mocks (must come before imports) ──

jest.mock('../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../src/modules/video/video.model', () => ({
  VideoClip: {
    findAndCountAll: (...a: unknown[]) => mockClipFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockClipFindByPk(...a),
    create: (...a: unknown[]) => mockClipCreate(...a),
  },
  VideoTag: {
    findAll: (...a: unknown[]) => mockTagFindAll(...a),
    findByPk: (...a: unknown[]) => mockTagFindByPk(...a),
    create: (...a: unknown[]) => mockTagCreate(...a),
  },
}));

jest.mock('../../../src/modules/players/player.model', () => ({
  Player: { name: 'Player' },
}));

jest.mock('../../../src/modules/users/user.model', () => ({
  User: { name: 'User' },
}));

jest.mock('../../../src/shared/utils/storage', () => ({
  uploadFile: (...a: unknown[]) => mockUploadFile(...a),
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

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as videoService from '../../../src/modules/video/video.service';

// ── Helpers ──

const mockClip = (overrides: Record<string, unknown> = {}) => ({
  id: 'clip-001',
  title: 'Goal Highlight',
  playerId: 'player-001',
  matchId: 'match-001',
  storageProvider: 'external',
  externalUrl: 'https://example.com/video.mp4',
  storagePath: null,
  mimeType: 'video/mp4',
  fileSizeMb: 10.5,
  status: 'ready',
  uploadedBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockTag = (overrides: Record<string, unknown> = {}) => ({
  id: 'tag-001',
  clipId: 'clip-001',
  tagType: 'goal',
  label: 'Goal',
  labelAr: 'هدف',
  timestampSec: 42,
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('Video Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Safe defaults
    mockClipFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    mockClipFindByPk.mockResolvedValue(null);
    mockClipCreate.mockResolvedValue(mockModelInstance(mockClip()));
    mockTagFindAll.mockResolvedValue([]);
    mockTagFindByPk.mockResolvedValue(null);
    mockTagCreate.mockResolvedValue(mockModelInstance(mockTag()));
    mockUploadFile.mockResolvedValue({
      key: 'video-clips/video.mp4',
      url: 'https://storage.example.com/video.mp4',
      mimeType: 'video/mp4',
    });
  });

  // ── listClips ──

  describe('listClips', () => {
    it('should return paginated clips with default page/limit', async () => {
      const rows = [mockModelInstance(mockClip()), mockModelInstance(mockClip({ id: 'clip-002' }))];
      mockClipFindAndCountAll.mockResolvedValue({ count: 2, rows });

      const result = await videoService.listClips({});

      expect(mockClipFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20, offset: 0 }),
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 2 });
    });

    it('should respect page and limit query params', async () => {
      mockClipFindAndCountAll.mockResolvedValue({ count: 50, rows: [] });

      const result = await videoService.listClips({ page: 3, limit: 10 });

      expect(mockClipFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 }),
      );
      expect(result.meta).toMatchObject({ page: 3, limit: 10, total: 50, totalPages: 5 });
    });

    it('should filter by matchId when provided', async () => {
      mockClipFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockClip())] });

      await videoService.listClips({ matchId: 'match-001' });

      const callArgs = mockClipFindAndCountAll.mock.calls[0][0];
      expect(callArgs.where).toMatchObject({ matchId: 'match-001' });
    });

    it('should filter by playerId when provided', async () => {
      mockClipFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockClip())] });

      await videoService.listClips({ playerId: 'player-001' });

      const callArgs = mockClipFindAndCountAll.mock.calls[0][0];
      expect(callArgs.where).toMatchObject({ playerId: 'player-001' });
    });

    it('should filter by status when provided', async () => {
      mockClipFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await videoService.listClips({ status: 'ready' });

      const callArgs = mockClipFindAndCountAll.mock.calls[0][0];
      expect(callArgs.where).toMatchObject({ status: 'ready' });
    });
  });

  // ── getClipById ──

  describe('getClipById', () => {
    it('should return clip when found', async () => {
      mockClipFindByPk.mockResolvedValue(mockModelInstance(mockClip()));

      const result = await videoService.getClipById('clip-001');

      expect(mockClipFindByPk).toHaveBeenCalledWith('clip-001', expect.any(Object));
      expect(result).toBeDefined();
    });

    it('should throw 404 when clip not found', async () => {
      mockClipFindByPk.mockResolvedValue(null);

      await expect(videoService.getClipById('bad-id')).rejects.toMatchObject({
        message: 'Video clip not found',
        statusCode: 404,
      });
    });
  });

  // ── createClip ──

  describe('createClip', () => {
    it('should create a clip with uploadedBy set to userId', async () => {
      const created = mockModelInstance(mockClip());
      mockClipCreate.mockResolvedValue(created);

      const result = await videoService.createClip(
        {
          title: 'Goal Highlight',
          externalUrl: 'https://example.com/video.mp4',
          storageProvider: 'external',
        },
        'user-001',
      );

      expect(mockClipCreate).toHaveBeenCalledWith(
        expect.objectContaining({ uploadedBy: 'user-001' }),
      );
      expect(result).toBeDefined();
    });

    it('should default storageProvider to "external" when not supplied', async () => {
      mockClipCreate.mockResolvedValue(mockModelInstance(mockClip()));

      await videoService.createClip({ title: 'Test' }, 'user-001');

      expect(mockClipCreate).toHaveBeenCalledWith(
        expect.objectContaining({ storageProvider: 'external' }),
      );
    });
  });

  // ── updateClip ──

  describe('updateClip', () => {
    it('should update a clip and return the result', async () => {
      const clip = mockModelInstance(mockClip());
      mockClipFindByPk.mockResolvedValue(clip);

      await videoService.updateClip('clip-001', { title: 'Updated Title' });

      expect(clip.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Title' }));
    });

    it('should throw 404 if clip not found', async () => {
      mockClipFindByPk.mockResolvedValue(null);

      await expect(videoService.updateClip('bad-id', { title: 'x' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── deleteClip ──

  describe('deleteClip', () => {
    it('should delete a clip and return its id', async () => {
      const clip = mockModelInstance(mockClip());
      mockClipFindByPk.mockResolvedValue(clip);

      const result = await videoService.deleteClip('clip-001');

      expect(clip.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'clip-001' });
    });

    it('should throw 404 when clip not found', async () => {
      mockClipFindByPk.mockResolvedValue(null);

      await expect(videoService.deleteClip('bad-id')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── uploadVideoFile ──

  describe('uploadVideoFile', () => {
    it('should upload file to GCS and create a clip record', async () => {
      const created = mockModelInstance(mockClip({ storageProvider: 'gcs' }));
      mockClipCreate.mockResolvedValue(created);

      const file = {
        buffer: Buffer.from('fake-video'),
        originalname: 'highlight.mp4',
        mimetype: 'video/mp4',
        size: 5 * 1024 * 1024, // 5 MB
      };

      const result = await videoService.uploadVideoFile(
        file,
        { title: 'Highlight', playerId: 'player-001' },
        'user-001',
      );

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'video-clips', originalName: 'highlight.mp4' }),
      );
      expect(mockClipCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          storageProvider: 'gcs',
          title: 'Highlight',
          uploadedBy: 'user-001',
        }),
      );
      expect(result).toBeDefined();
    });
  });

  // ── listTagsForClip ──

  describe('listTagsForClip', () => {
    it('should return tags for an existing clip', async () => {
      mockClipFindByPk.mockResolvedValue(mockModelInstance(mockClip()));
      const tags = [mockModelInstance(mockTag()), mockModelInstance(mockTag({ id: 'tag-002', timestampSec: 90 }))];
      mockTagFindAll.mockResolvedValue(tags);

      const result = await videoService.listTagsForClip('clip-001');

      expect(mockTagFindAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clipId: 'clip-001' } }),
      );
      expect(result).toHaveLength(2);
    });

    it('should throw 404 if clip does not exist', async () => {
      mockClipFindByPk.mockResolvedValue(null);

      await expect(videoService.listTagsForClip('bad-id')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── getTagById ──

  describe('getTagById', () => {
    it('should return tag when found', async () => {
      mockTagFindByPk.mockResolvedValue(mockModelInstance(mockTag()));

      const result = await videoService.getTagById('tag-001');

      expect(result).toBeDefined();
    });

    it('should throw 404 when tag not found', async () => {
      mockTagFindByPk.mockResolvedValue(null);

      await expect(videoService.getTagById('bad-id')).rejects.toMatchObject({
        message: 'Video tag not found',
        statusCode: 404,
      });
    });
  });

  // ── createTag ──

  describe('createTag', () => {
    it('should create a tag for an existing clip', async () => {
      mockClipFindByPk.mockResolvedValue(mockModelInstance(mockClip()));
      const created = mockModelInstance(mockTag());
      mockTagCreate.mockResolvedValue(created);

      const result = await videoService.createTag(
        'clip-001',
        { tagType: 'goal', label: 'Goal', timestampSec: 42 },
        'user-001',
      );

      expect(mockTagCreate).toHaveBeenCalledWith(
        expect.objectContaining({ clipId: 'clip-001', createdBy: 'user-001' }),
      );
      expect(result).toBeDefined();
    });

    it('should throw 404 if clip does not exist', async () => {
      mockClipFindByPk.mockResolvedValue(null);

      await expect(
        videoService.createTag('bad-id', { tagType: 'goal', label: 'Goal', timestampSec: 42 }, 'user-001'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── updateTag ──

  describe('updateTag', () => {
    it('should update a tag and return result', async () => {
      const tag = mockModelInstance(mockTag());
      mockTagFindByPk.mockResolvedValue(tag);

      await videoService.updateTag('tag-001', { label: 'Updated Label' });

      expect(tag.update).toHaveBeenCalledWith(expect.objectContaining({ label: 'Updated Label' }));
    });

    it('should throw 404 when tag not found', async () => {
      mockTagFindByPk.mockResolvedValue(null);

      await expect(videoService.updateTag('bad-id', { label: 'x' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── deleteTag ──

  describe('deleteTag', () => {
    it('should delete a tag and return its id', async () => {
      const tag = mockModelInstance(mockTag());
      mockTagFindByPk.mockResolvedValue(tag);

      const result = await videoService.deleteTag('tag-001');

      expect(tag.destroy).toHaveBeenCalled();
      expect(result).toEqual({ id: 'tag-001' });
    });

    it('should throw 404 when tag not found', async () => {
      mockTagFindByPk.mockResolvedValue(null);

      await expect(videoService.deleteTag('bad-id')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ── getTagSummaryForClip ──

  describe('getTagSummaryForClip', () => {
    it('should return tag summary grouped by type', async () => {
      const tags = [
        { ...mockTag({ tagType: 'goal' }) },
        { ...mockTag({ id: 'tag-002', tagType: 'goal' }) },
        { ...mockTag({ id: 'tag-003', tagType: 'foul' }) },
      ];
      mockTagFindAll.mockResolvedValue(tags);

      const result = await videoService.getTagSummaryForClip('clip-001');

      expect(result.total).toBe(3);
      expect(result.byType).toMatchObject({ goal: 2, foul: 1 });
      expect(result.tags).toHaveLength(3);
    });

    it('should return zero totals when clip has no tags', async () => {
      mockTagFindAll.mockResolvedValue([]);

      const result = await videoService.getTagSummaryForClip('clip-001');

      expect(result.total).toBe(0);
      expect(result.byType).toEqual({});
    });
  });
});
