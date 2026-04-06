import {
  createClubSchema,
  updateClubSchema,
  clubQuerySchema,
  createContactSchema,
  updateContactSchema,
} from '../../../src/modules/clubs/club.validation';

describe('Club Schemas', () => {
  describe('createClubSchema', () => {
    it('should accept valid club with country and league', () => {
      expect(createClubSchema.safeParse({ name: 'Al-Hilal', country: 'Saudi Arabia', league: 'SPL' }).success).toBe(true);
    });
    it('should reject club without country', () => {
      expect(createClubSchema.safeParse({ name: 'Al-Hilal', league: 'SPL' }).success).toBe(false);
    });
    it('should reject club without league', () => {
      expect(createClubSchema.safeParse({ name: 'Al-Hilal', country: 'Saudi Arabia' }).success).toBe(false);
    });
    it('should reject empty name', () => {
      expect(createClubSchema.safeParse({ name: '', country: 'SA', league: 'SPL' }).success).toBe(false);
    });
    it('should default type to Club', () => {
      expect(createClubSchema.parse({ name: 'Test', country: 'SA', league: 'SPL' }).type).toBe('Club');
    });
    it('should accept Sponsor type without country/league', () => {
      expect(createClubSchema.safeParse({ name: 'Nike', type: 'Sponsor' }).success).toBe(true);
    });
    it('should reject invalid type', () => {
      expect(createClubSchema.safeParse({ name: 'X', type: 'Team' }).success).toBe(false);
    });
    it('should reject invalid logoUrl', () => {
      expect(createClubSchema.safeParse({ name: 'X', country: 'SA', league: 'SPL', logoUrl: 'not-url' }).success).toBe(false);
    });
  });

  describe('updateClubSchema', () => {
    it('should accept partial update', () => {
      expect(updateClubSchema.safeParse({ city: 'Riyadh' }).success).toBe(true);
    });
    it('should accept empty object', () => {
      expect(updateClubSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('clubQuerySchema', () => {
    it('should default sort to name', () => {
      expect(clubQuerySchema.parse({}).sort).toBe('name');
    });
    it('should default order to asc', () => {
      expect(clubQuerySchema.parse({}).order).toBe('asc');
    });
    it('should coerce page string', () => {
      expect(clubQuerySchema.parse({ page: '2' }).page).toBe(2);
    });
  });

  describe('createContactSchema', () => {
    it('should accept valid contact', () => {
      expect(createContactSchema.safeParse({ name: 'John', role: 'Agent' }).success).toBe(true);
    });
    it('should reject missing role', () => {
      expect(createContactSchema.safeParse({ name: 'John' }).success).toBe(false);
    });
    it('should default isPrimary to false', () => {
      expect(createContactSchema.parse({ name: 'John', role: 'Agent' }).isPrimary).toBe(false);
    });
    it('should reject invalid email', () => {
      expect(createContactSchema.safeParse({ name: 'J', role: 'R', email: 'bad' }).success).toBe(false);
    });
  });

  describe('updateContactSchema', () => {
    it('should accept partial update', () => {
      expect(updateContactSchema.safeParse({ name: 'Jane' }).success).toBe(true);
    });
  });
});
