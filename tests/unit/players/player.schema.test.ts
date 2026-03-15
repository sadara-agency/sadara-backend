import {
  createPlayerSchema,
  updatePlayerSchema,
  playerQuerySchema,
} from '../../../src/modules/players/utils/player.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Player Schemas', () => {
  describe('createPlayerSchema', () => {
    const valid = {
      firstName: 'Ahmed',
      lastName: 'Ali',
      firstNameAr: 'أحمد',
      lastNameAr: 'علي',
      dateOfBirth: '1998-05-15',
      nationality: 'Saudi',
      position: 'Forward',
      preferredFoot: 'Right' as const,
      heightCm: 180,
      weightKg: 75,
      email: 'ahmed@example.com',
      phone: '+966501234567',
    };

    it('should accept valid input', () => {
      expect(createPlayerSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject empty firstName', () => {
      expect(createPlayerSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
    });
    it('should reject missing dateOfBirth', () => {
      expect(createPlayerSchema.safeParse({ firstName: 'A', lastName: 'B' }).success).toBe(false);
    });
    it('should reject invalid date format', () => {
      expect(createPlayerSchema.safeParse({ ...valid, dateOfBirth: '15/05/1998' }).success).toBe(false);
    });
    it('should default playerType to Pro', () => {
      const result = createPlayerSchema.parse(valid);
      expect(result.playerType).toBe('Pro');
    });
    it('should reject invalid preferredFoot', () => {
      expect(createPlayerSchema.safeParse({ ...valid, preferredFoot: 'Neither' }).success).toBe(false);
    });
    it('should reject jerseyNumber > 99', () => {
      expect(createPlayerSchema.safeParse({ ...valid, jerseyNumber: 100 }).success).toBe(false);
    });
    it('should reject invalid UUID for currentClubId', () => {
      expect(createPlayerSchema.safeParse({ ...valid, currentClubId: 'bad' }).success).toBe(false);
    });
  });

  describe('updatePlayerSchema', () => {
    it('should accept partial updates', () => {
      expect(updatePlayerSchema.safeParse({ firstName: 'New' }).success).toBe(true);
    });
    it('should accept empty object', () => {
      expect(updatePlayerSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('playerQuerySchema', () => {
    it('should coerce page string to number', () => {
      const result = playerQuerySchema.parse({ page: '3' });
      expect(result.page).toBe(3);
    });
    it('should default sort to created_at', () => {
      expect(playerQuerySchema.parse({}).sort).toBe('created_at');
    });
    it('should reject invalid status', () => {
      expect(playerQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false);
    });
    it('should reject invalid UUID for clubId', () => {
      expect(playerQuerySchema.safeParse({ clubId: 'not-uuid' }).success).toBe(false);
    });
  });
});
