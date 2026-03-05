import {
  createReferralSchema,
  updateReferralSchema,
  updateReferralStatusSchema,
  referralQuerySchema,
} from '../../../src/modules/referrals/referral.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Referral Schemas', () => {
  describe('createReferralSchema', () => {
    it('should accept valid referral', () => {
      expect(createReferralSchema.safeParse({ referralType: 'Performance', playerId: UUID }).success).toBe(true);
    });
    it('should reject invalid type', () => {
      expect(createReferralSchema.safeParse({ referralType: 'Academic', playerId: UUID }).success).toBe(false);
    });
    it('should default priority to Medium', () => {
      expect(createReferralSchema.parse({ referralType: 'Mental', playerId: UUID }).priority).toBe('Medium');
    });
    it('should default isRestricted to false', () => {
      expect(createReferralSchema.parse({ referralType: 'Medical', playerId: UUID }).isRestricted).toBe(false);
    });
    it('should reject invalid UUID', () => {
      expect(createReferralSchema.safeParse({ referralType: 'Performance', playerId: 'bad' }).success).toBe(false);
    });
  });

  describe('updateReferralStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updateReferralStatusSchema.safeParse({ status: 'Resolved' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(updateReferralStatusSchema.safeParse({ status: 'Closed' }).success).toBe(false);
    });
  });

  describe('referralQuerySchema', () => {
    it('should default sort to created_at', () => {
      expect(referralQuerySchema.parse({}).sort).toBe('created_at');
    });
    it('should accept all filter combinations', () => {
      expect(referralQuerySchema.safeParse({
        status: 'Open',
        referralType: 'Mental',
        priority: 'High',
      }).success).toBe(true);
    });
  });
});
