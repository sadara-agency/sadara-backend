import {
  syncPlayerSchema,
  syncTeamSchema,
  syncAllSchema,
  seedClubIdsSchema,
} from '../../../src/modules/spl/spl.validation';

describe('SPL Schemas', () => {
  describe('syncPlayerSchema', () => {
    it('should accept numeric string', () => {
      expect(syncPlayerSchema.safeParse({ splPlayerId: '12345' }).success).toBe(true);
    });
    it('should reject non-numeric string', () => {
      expect(syncPlayerSchema.safeParse({ splPlayerId: 'abc' }).success).toBe(false);
    });
    it('should accept optional slug', () => {
      expect(syncPlayerSchema.safeParse({ splPlayerId: '123', slug: 'ahmed-ali' }).success).toBe(true);
    });
  });

  describe('syncTeamSchema', () => {
    it('should accept numeric string', () => {
      expect(syncTeamSchema.safeParse({ splTeamId: '42' }).success).toBe(true);
    });
    it('should reject non-numeric', () => {
      expect(syncTeamSchema.safeParse({ splTeamId: 'team' }).success).toBe(false);
    });
  });

  describe('syncAllSchema', () => {
    it('should accept confirm true', () => {
      expect(syncAllSchema.safeParse({ confirm: true }).success).toBe(true);
    });
    it('should reject confirm false', () => {
      expect(syncAllSchema.safeParse({ confirm: false }).success).toBe(false);
    });
  });

  describe('seedClubIdsSchema', () => {
    it('should accept confirm true', () => {
      expect(seedClubIdsSchema.safeParse({ confirm: true }).success).toBe(true);
    });
    it('should reject missing confirm', () => {
      expect(seedClubIdsSchema.safeParse({}).success).toBe(false);
    });
  });
});
