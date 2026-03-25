import {
  generatePlayerKitSchema,
  generateSquadKitSchema,
  mediaKitHistoryQuerySchema,
} from '../../../../src/modules/media/media-kits/mediaKit.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Media Kit Schemas', () => {
  describe('generatePlayerKitSchema', () => {
    it('should default language to both', () => {
      const result = generatePlayerKitSchema.parse({});
      expect(result.language).toBe('both');
    });

    it('should accept en language', () => {
      expect(generatePlayerKitSchema.safeParse({ language: 'en' }).success).toBe(true);
    });

    it('should accept ar language', () => {
      expect(generatePlayerKitSchema.safeParse({ language: 'ar' }).success).toBe(true);
    });

    it('should reject invalid language', () => {
      expect(generatePlayerKitSchema.safeParse({ language: 'fr' }).success).toBe(false);
    });
  });

  describe('generateSquadKitSchema', () => {
    it('should default language to both', () => {
      const result = generateSquadKitSchema.parse({});
      expect(result.language).toBe('both');
    });

    it('should reject invalid language', () => {
      expect(generateSquadKitSchema.safeParse({ language: 'es' }).success).toBe(false);
    });
  });

  describe('mediaKitHistoryQuerySchema', () => {
    it('should default page, limit, sort, order', () => {
      const result = mediaKitHistoryQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('created_at');
      expect(result.order).toBe('desc');
    });

    it('should accept templateType filter', () => {
      const result = mediaKitHistoryQuerySchema.parse({ templateType: 'player_profile' });
      expect(result.templateType).toBe('player_profile');
    });

    it('should accept playerId and clubId filters', () => {
      const result = mediaKitHistoryQuerySchema.parse({ playerId: UUID, clubId: UUID });
      expect(result.playerId).toBe(UUID);
      expect(result.clubId).toBe(UUID);
    });

    it('should reject invalid templateType', () => {
      expect(mediaKitHistoryQuerySchema.safeParse({ templateType: 'poster' }).success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      expect(mediaKitHistoryQuerySchema.safeParse({ playerId: 'bad' }).success).toBe(false);
    });
  });
});
