import {
  createSocialPostSchema,
  updateSocialPostSchema,
  updateSocialPostStatusSchema,
  socialPostQuerySchema,
} from '../../../../src/modules/media/social-media/socialPost.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Social Post Schemas', () => {
  describe('createSocialPostSchema', () => {
    const valid = {
      title: 'Match day post',
      postType: 'match_day' as const,
      platforms: ['twitter' as const, 'instagram' as const],
    };

    it('should accept valid minimal input', () => {
      expect(createSocialPostSchema.safeParse(valid).success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const full = {
        ...valid,
        titleAr: 'منشور يوم المباراة',
        contentEn: 'Today we play!',
        contentAr: 'اليوم نلعب!',
        scheduledAt: '2026-04-01T18:00:00Z',
        playerId: UUID,
        clubId: UUID,
        matchId: UUID,
        imageUrls: ['https://example.com/img.jpg'],
        tags: ['matchday', 'spl'],
      };
      expect(createSocialPostSchema.safeParse(full).success).toBe(true);
    });

    it('should reject missing title', () => {
      expect(createSocialPostSchema.safeParse({ postType: 'general', platforms: ['twitter'] }).success).toBe(false);
    });

    it('should reject missing platforms', () => {
      expect(createSocialPostSchema.safeParse({ title: 'Test', postType: 'general' }).success).toBe(false);
    });

    it('should reject empty platforms array', () => {
      expect(createSocialPostSchema.safeParse({ title: 'Test', postType: 'general', platforms: [] }).success).toBe(false);
    });

    it('should reject missing postType', () => {
      expect(createSocialPostSchema.safeParse({ title: 'Test', platforms: ['twitter'] }).success).toBe(false);
    });

    it('should reject invalid postType', () => {
      expect(createSocialPostSchema.safeParse({ ...valid, postType: 'invalid' }).success).toBe(false);
    });

    it('should reject invalid platform', () => {
      expect(createSocialPostSchema.safeParse({ ...valid, platforms: ['myspace'] }).success).toBe(false);
    });

    it('should reject invalid imageUrl', () => {
      expect(createSocialPostSchema.safeParse({ ...valid, imageUrls: ['not-url'] }).success).toBe(false);
    });

    it('should reject invalid UUID for playerId', () => {
      expect(createSocialPostSchema.safeParse({ ...valid, playerId: 'bad' }).success).toBe(false);
    });

    it('should accept all valid post types', () => {
      for (const t of ['match_day', 'transfer', 'injury_update', 'achievement', 'general', 'custom']) {
        expect(createSocialPostSchema.safeParse({ ...valid, postType: t }).success).toBe(true);
      }
    });

    it('should accept all valid platforms', () => {
      for (const p of ['twitter', 'instagram', 'linkedin', 'facebook', 'tiktok']) {
        expect(createSocialPostSchema.safeParse({ ...valid, platforms: [p] }).success).toBe(true);
      }
    });
  });

  describe('updateSocialPostSchema', () => {
    it('should accept partial updates', () => {
      expect(updateSocialPostSchema.safeParse({ title: 'Updated' }).success).toBe(true);
    });

    it('should accept empty object', () => {
      expect(updateSocialPostSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('updateSocialPostStatusSchema', () => {
    it('should accept valid statuses', () => {
      for (const s of ['draft', 'scheduled', 'published', 'archived']) {
        expect(updateSocialPostStatusSchema.safeParse({ status: s }).success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      expect(updateSocialPostStatusSchema.safeParse({ status: 'pending' }).success).toBe(false);
    });
  });

  describe('socialPostQuerySchema', () => {
    it('should default page, limit, sort, order', () => {
      const result = socialPostQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('created_at');
      expect(result.order).toBe('desc');
    });

    it('should accept all filters', () => {
      const result = socialPostQuerySchema.parse({
        postType: 'match_day',
        status: 'draft',
        playerId: UUID,
        clubId: UUID,
        search: 'test',
      });
      expect(result.postType).toBe('match_day');
      expect(result.status).toBe('draft');
    });

    it('should coerce string page/limit', () => {
      const result = socialPostQuerySchema.parse({ page: '2', limit: '10' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });
});
