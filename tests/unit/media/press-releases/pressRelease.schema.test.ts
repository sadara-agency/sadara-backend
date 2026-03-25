import {
  createPressReleaseSchema,
  updatePressReleaseSchema,
  updatePressReleaseStatusSchema,
  pressReleaseQuerySchema,
} from '../../../../src/modules/media/press-releases/pressRelease.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Press Release Schemas', () => {
  describe('createPressReleaseSchema', () => {
    const valid = { title: 'Player signs new contract' };

    it('should accept valid minimal input', () => {
      expect(createPressReleaseSchema.safeParse(valid).success).toBe(true);
    });

    it('should apply default category', () => {
      const result = createPressReleaseSchema.parse(valid);
      expect(result.category).toBe('general');
    });

    it('should accept all optional fields', () => {
      const full = {
        ...valid,
        titleAr: 'اللاعب يوقع عقد جديد',
        category: 'transfer' as const,
        contentEn: '<p>English content</p>',
        contentAr: '<p>محتوى عربي</p>',
        excerptEn: 'Short summary',
        excerptAr: 'ملخص قصير',
        coverImageUrl: 'https://example.com/img.jpg',
        playerId: UUID,
        clubId: UUID,
        matchId: UUID,
        tags: ['transfer', 'signing'],
      };
      expect(createPressReleaseSchema.safeParse(full).success).toBe(true);
    });

    it('should reject missing title', () => {
      expect(createPressReleaseSchema.safeParse({}).success).toBe(false);
    });

    it('should reject empty title', () => {
      expect(createPressReleaseSchema.safeParse({ title: '' }).success).toBe(false);
    });

    it('should reject invalid category', () => {
      expect(createPressReleaseSchema.safeParse({ ...valid, category: 'breaking' }).success).toBe(false);
    });

    it('should reject invalid coverImageUrl', () => {
      expect(createPressReleaseSchema.safeParse({ ...valid, coverImageUrl: 'not-url' }).success).toBe(false);
    });

    it('should reject title exceeding max length', () => {
      expect(createPressReleaseSchema.safeParse({ title: 'x'.repeat(501) }).success).toBe(false);
    });
  });

  describe('updatePressReleaseSchema', () => {
    it('should accept partial updates', () => {
      expect(updatePressReleaseSchema.safeParse({ title: 'Updated' }).success).toBe(true);
    });

    it('should accept empty object', () => {
      expect(updatePressReleaseSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('updatePressReleaseStatusSchema', () => {
    it('should accept valid status values', () => {
      for (const s of ['draft', 'review', 'approved', 'published', 'archived']) {
        expect(updatePressReleaseStatusSchema.safeParse({ status: s }).success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      expect(updatePressReleaseStatusSchema.safeParse({ status: 'pending' }).success).toBe(false);
    });
  });

  describe('pressReleaseQuerySchema', () => {
    it('should default page, limit, sort, order', () => {
      const result = pressReleaseQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('created_at');
      expect(result.order).toBe('desc');
    });

    it('should accept status and category filters', () => {
      const result = pressReleaseQuerySchema.parse({ status: 'published', category: 'transfer' });
      expect(result.status).toBe('published');
      expect(result.category).toBe('transfer');
    });
  });
});
