import {
  createMediaContactSchema,
  updateMediaContactSchema,
  mediaContactQuerySchema,
} from '../../../../src/modules/media/media-contacts/mediaContact.schema';

describe('Media Contact Schemas', () => {
  describe('createMediaContactSchema', () => {
    const valid = { name: 'Ahmed Ali', outlet: 'Al Arabiya' };

    it('should accept valid minimal input', () => {
      expect(createMediaContactSchema.safeParse(valid).success).toBe(true);
    });

    it('should accept all optional fields', () => {
      const full = {
        ...valid,
        nameAr: 'أحمد علي',
        outletAr: 'العربية',
        email: 'ahmed@alarabiya.net',
        phone: '+966512345678',
        role: 'Editor',
        notes: 'Key contact for transfers',
      };
      expect(createMediaContactSchema.safeParse(full).success).toBe(true);
    });

    it('should reject missing name', () => {
      expect(createMediaContactSchema.safeParse({ outlet: 'BBC' }).success).toBe(false);
    });

    it('should reject missing outlet', () => {
      expect(createMediaContactSchema.safeParse({ name: 'John' }).success).toBe(false);
    });

    it('should reject empty name', () => {
      expect(createMediaContactSchema.safeParse({ name: '', outlet: 'BBC' }).success).toBe(false);
    });

    it('should reject invalid email', () => {
      expect(createMediaContactSchema.safeParse({ ...valid, email: 'bad' }).success).toBe(false);
    });

    it('should reject name exceeding max length', () => {
      expect(createMediaContactSchema.safeParse({ ...valid, name: 'x'.repeat(256) }).success).toBe(false);
    });
  });

  describe('updateMediaContactSchema', () => {
    it('should accept partial updates', () => {
      expect(updateMediaContactSchema.safeParse({ name: 'Updated' }).success).toBe(true);
    });

    it('should accept empty object', () => {
      expect(updateMediaContactSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('mediaContactQuerySchema', () => {
    it('should default page, limit, sort, order', () => {
      const result = mediaContactQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('created_at');
      expect(result.order).toBe('desc');
    });

    it('should accept outlet filter', () => {
      const result = mediaContactQuerySchema.parse({ outlet: 'BBC' });
      expect(result.outlet).toBe('BBC');
    });

    it('should accept search', () => {
      const result = mediaContactQuerySchema.parse({ search: 'ahmed' });
      expect(result.search).toBe('ahmed');
    });
  });
});
