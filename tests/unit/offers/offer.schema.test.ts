import {
  createOfferSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
  offerQuerySchema,
} from '../../../src/modules/offers/offer.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

function futureDate(yearsFromNow: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsFromNow);
  return d.toISOString().split('T')[0];
}

describe('Offer Schemas', () => {
  describe('createOfferSchema', () => {
    it('should accept valid offer', () => {
      expect(createOfferSchema.safeParse({ playerId: UUID }).success).toBe(true);
    });
    it('should reject invalid playerId', () => {
      expect(createOfferSchema.safeParse({ playerId: 'bad' }).success).toBe(false);
    });
    it('should default offerType to Transfer', () => {
      expect(createOfferSchema.parse({ playerId: UUID }).offerType).toBe('Transfer');
    });
    it('should default feeCurrency to SAR', () => {
      expect(createOfferSchema.parse({ playerId: UUID }).feeCurrency).toBe('SAR');
    });
    it('should reject invalid deadline date', () => {
      expect(createOfferSchema.safeParse({ playerId: UUID, deadline: '15/06/2025' }).success).toBe(false);
    });
    it('should accept valid deadline', () => {
      expect(createOfferSchema.safeParse({ playerId: UUID, deadline: futureDate(1) }).success).toBe(true);
    });
  });

  describe('updateOfferStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updateOfferStatusSchema.safeParse({ status: 'Under Review' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(updateOfferStatusSchema.safeParse({ status: 'Invalid' }).success).toBe(false);
    });
  });

  describe('offerQuerySchema', () => {
    it('should default sort to created_at', () => {
      expect(offerQuerySchema.parse({}).sort).toBe('created_at');
    });
    it('should accept status filter', () => {
      expect(offerQuerySchema.safeParse({ status: 'Closed' }).success).toBe(true);
    });
  });
});
