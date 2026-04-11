/// <reference types="jest" />
import { mockModelInstance } from '../../../setup/test-helpers';

const mockFindAndCountAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();

jest.mock('../../../../src/config/database', () => ({
  sequelize: { query: jest.fn(), authenticate: jest.fn() },
}));

jest.mock('../../../../src/modules/media/social-media/socialPost.model', () => ({
  SocialPost: {
    findAndCountAll: (...a: unknown[]) => mockFindAndCountAll(...a),
    findByPk: (...a: unknown[]) => mockFindByPk(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

jest.mock('../../../../src/modules/players/player.model', () => ({ Player: {} }));
jest.mock('../../../../src/modules/clubs/club.model', () => ({ Club: {} }));
jest.mock('../../../../src/modules/matches/match.model', () => ({ Match: {} }));
jest.mock('../../../../src/modules/users/user.model', () => ({ User: {} }));
jest.mock('../../../../src/modules/notifications/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
  notifyByRole: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../../../src/modules/calendar/event.service', () => ({
  createEvent: jest.fn().mockResolvedValue({ id: 'evt-001' }),
}));
jest.mock('../../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import * as svc from '../../../../src/modules/media/social-media/socialPost.service';

const mockPost = (overrides: Record<string, any> = {}) => ({
  id: 'post-001',
  title: 'Match Day Post',
  postType: 'match_day',
  platforms: ['twitter', 'instagram'],
  status: 'draft',
  createdBy: 'user-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Social Post Service', () => {
  beforeEach(() => jest.clearAllMocks());

  // getSocialPostById is called internally by create/update/etc so we mock it consistently
  const setupFindByPk = (data: Record<string, any>) => {
    mockFindByPk.mockResolvedValue(mockModelInstance(data));
  };

  describe('listSocialPosts', () => {
    it('should return paginated results', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: [mockModelInstance(mockPost())] });
      const result = await svc.listSocialPosts({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toBeDefined();
    });

    it('should return empty when no results', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      const result = await svc.listSocialPosts({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(0);
    });

    it('should filter by postType', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listSocialPosts({ postType: 'match_day', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ postType: 'match_day' }) }),
      );
    });

    it('should filter by status', async () => {
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      await svc.listSocialPosts({ status: 'draft', page: 1, limit: 10 });
      expect(mockFindAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'draft' }) }),
      );
    });
  });

  describe('getSocialPostById', () => {
    it('should return the post', async () => {
      setupFindByPk(mockPost());
      const result = await svc.getSocialPostById('post-001');
      expect(result.id).toBe('post-001');
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.getSocialPostById('bad')).rejects.toThrow('Social media post not found');
    });
  });

  describe('createSocialPost', () => {
    it('should create with createdBy and return enriched post', async () => {
      const created = mockModelInstance(mockPost());
      mockCreate.mockResolvedValue(created);
      // getSocialPostById is called after create
      mockFindByPk.mockResolvedValue(mockModelInstance(mockPost()));
      const result = await svc.createSocialPost(
        { title: 'Test', postType: 'general', platforms: ['twitter'] },
        'user-001',
      );
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'user-001' }));
      expect(result).toBeDefined();
    });

    it('should convert scheduledAt string to Date', async () => {
      mockCreate.mockResolvedValue(mockModelInstance(mockPost()));
      mockFindByPk.mockResolvedValue(mockModelInstance(mockPost()));
      await svc.createSocialPost(
        { title: 'Test', postType: 'general', platforms: ['twitter'], scheduledAt: '2026-04-01T18:00:00Z' },
        'user-001',
      );
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ scheduledAt: expect.any(Date) }));
    });
  });

  describe('updateSocialPost', () => {
    it('should update a draft post', async () => {
      const post = mockModelInstance(mockPost({ status: 'draft' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.updateSocialPost('post-001', { title: 'Updated' });
      expect(post.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated' }));
    });

    it('should reject editing a published post', async () => {
      setupFindByPk(mockPost({ status: 'published' }));
      await expect(svc.updateSocialPost('post-001', { title: 'x' })).rejects.toThrow('Cannot edit a published or archived post');
    });

    it('should reject editing an archived post', async () => {
      setupFindByPk(mockPost({ status: 'archived' }));
      await expect(svc.updateSocialPost('post-001', { title: 'x' })).rejects.toThrow('Cannot edit a published or archived post');
    });
  });

  describe('updateSocialPostStatus', () => {
    it('should allow draft → scheduled', async () => {
      const post = mockModelInstance(mockPost({ status: 'draft' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.updateSocialPostStatus('post-001', { status: 'scheduled' });
      expect(post.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'scheduled' }));
    });

    it('should allow draft → published and set publishedAt', async () => {
      const post = mockModelInstance(mockPost({ status: 'draft' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.updateSocialPostStatus('post-001', { status: 'published' });
      expect(post.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published', publishedAt: expect.any(Date) }));
    });

    it('should allow scheduled → draft', async () => {
      const post = mockModelInstance(mockPost({ status: 'scheduled' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.updateSocialPostStatus('post-001', { status: 'draft' });
      expect(post.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
    });

    it('should allow scheduled → published', async () => {
      const post = mockModelInstance(mockPost({ status: 'scheduled' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.updateSocialPostStatus('post-001', { status: 'published' });
      expect(post.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
    });

    it('should allow published → archived', async () => {
      const post = mockModelInstance(mockPost({ status: 'published' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.updateSocialPostStatus('post-001', { status: 'archived' });
      expect(post.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'archived' }));
    });

    it('should allow archived → draft', async () => {
      const post = mockModelInstance(mockPost({ status: 'archived' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.updateSocialPostStatus('post-001', { status: 'draft' });
      expect(post.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
    });

    it('should reject draft → archived', async () => {
      setupFindByPk(mockPost({ status: 'draft' }));
      await expect(svc.updateSocialPostStatus('post-001', { status: 'archived' })).rejects.toThrow('Cannot transition from "draft" to "archived"');
    });

    it('should reject published → draft', async () => {
      setupFindByPk(mockPost({ status: 'published' }));
      await expect(svc.updateSocialPostStatus('post-001', { status: 'draft' })).rejects.toThrow('Cannot transition from "published" to "draft"');
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.updateSocialPostStatus('bad', { status: 'published' })).rejects.toThrow('Social media post not found');
    });
  });

  describe('deleteSocialPost', () => {
    it('should delete a draft post', async () => {
      const post = mockModelInstance(mockPost({ status: 'draft' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.deleteSocialPost('post-001');
      expect(post.destroy).toHaveBeenCalled();
    });

    it('should reject deleting a published post', async () => {
      setupFindByPk(mockPost({ status: 'published' }));
      await expect(svc.deleteSocialPost('post-001')).rejects.toThrow('Cannot delete a published post');
    });

    it('should allow deleting an archived post', async () => {
      const post = mockModelInstance(mockPost({ status: 'archived' }));
      mockFindByPk.mockResolvedValue(post);
      await svc.deleteSocialPost('post-001');
      expect(post.destroy).toHaveBeenCalled();
    });

    it('should throw 404 if not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      await expect(svc.deleteSocialPost('bad')).rejects.toThrow('Social media post not found');
    });
  });
});
