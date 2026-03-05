import {
  tournamentQuerySchema,
  fetchRequestSchema,
  mapTeamSchema,
  importRequestSchema,
} from '../../../src/modules/saff/saff.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('SAFF Schemas', () => {
  describe('fetchRequestSchema', () => {
    const valid = { tournamentIds: [1, 2], season: '2024-2025' };

    it('should accept valid input', () => {
      expect(fetchRequestSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject empty tournamentIds', () => {
      expect(fetchRequestSchema.safeParse({ ...valid, tournamentIds: [] }).success).toBe(false);
    });
    it('should reject invalid season format', () => {
      expect(fetchRequestSchema.safeParse({ ...valid, season: '2024' }).success).toBe(false);
    });
    it('should default dataTypes', () => {
      const result = fetchRequestSchema.parse(valid);
      expect(result.dataTypes).toEqual(['standings', 'fixtures', 'teams']);
    });
  });

  describe('mapTeamSchema', () => {
    it('should accept valid mapping', () => {
      expect(mapTeamSchema.safeParse({ saffTeamId: 42, season: '2024-2025', clubId: UUID }).success).toBe(true);
    });
    it('should reject invalid clubId', () => {
      expect(mapTeamSchema.safeParse({ saffTeamId: 1, season: '2024-2025', clubId: 'bad' }).success).toBe(false);
    });
  });

  describe('importRequestSchema', () => {
    it('should accept valid import', () => {
      expect(importRequestSchema.safeParse({ tournamentIds: [1], season: '2024-2025', importTypes: ['clubs'] }).success).toBe(true);
    });
    it('should reject invalid importType', () => {
      expect(importRequestSchema.safeParse({ tournamentIds: [1], season: '2024-2025', importTypes: ['players'] }).success).toBe(false);
    });
  });

  describe('tournamentQuerySchema', () => {
    it('should default page and limit', () => {
      const result = tournamentQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });
  });
});
