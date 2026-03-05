import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  createPaymentSchema,
  updatePaymentStatusSchema,
  createLedgerEntrySchema,
  createValuationSchema,
} from '../../../src/modules/finance/finance.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Finance Schemas', () => {
  describe('createInvoiceSchema', () => {
    const valid = { amount: 50000, totalAmount: 55000, dueDate: '2025-06-30' };

    it('should accept valid invoice', () => {
      expect(createInvoiceSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject non-positive amount', () => {
      expect(createInvoiceSchema.safeParse({ ...valid, amount: -1 }).success).toBe(false);
    });
    it('should default currency to SAR', () => {
      expect(createInvoiceSchema.parse(valid).currency).toBe('SAR');
    });
    it('should default taxAmount to 0', () => {
      expect(createInvoiceSchema.parse(valid).taxAmount).toBe(0);
    });
  });

  describe('updateInvoiceStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updateInvoiceStatusSchema.safeParse({ status: 'Paid' }).success).toBe(true);
    });
    it('should reject invalid status', () => {
      expect(updateInvoiceStatusSchema.safeParse({ status: 'Unknown' }).success).toBe(false);
    });
  });

  describe('createPaymentSchema', () => {
    const valid = { amount: 10000, dueDate: '2025-06-30' };

    it('should accept valid payment', () => {
      expect(createPaymentSchema.safeParse(valid).success).toBe(true);
    });
    it('should default paymentType to Commission', () => {
      expect(createPaymentSchema.parse(valid).paymentType).toBe('Commission');
    });
    it('should reject non-positive amount', () => {
      expect(createPaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    });
  });

  describe('updatePaymentStatusSchema', () => {
    it('should accept valid status', () => {
      expect(updatePaymentStatusSchema.safeParse({ status: 'Paid' }).success).toBe(true);
    });
  });

  describe('createLedgerEntrySchema', () => {
    const valid = { side: 'Debit', account: 'Revenue', amount: 5000 };

    it('should accept valid ledger entry', () => {
      expect(createLedgerEntrySchema.safeParse(valid).success).toBe(true);
    });
    it('should reject invalid side', () => {
      expect(createLedgerEntrySchema.safeParse({ ...valid, side: 'Both' }).success).toBe(false);
    });
    it('should default currency to SAR', () => {
      expect(createLedgerEntrySchema.parse(valid).currency).toBe('SAR');
    });
  });

  describe('createValuationSchema', () => {
    const valid = { playerId: UUID, value: 1000000 };

    it('should accept valid valuation', () => {
      expect(createValuationSchema.safeParse(valid).success).toBe(true);
    });
    it('should default trend to stable', () => {
      expect(createValuationSchema.parse(valid).trend).toBe('stable');
    });
    it('should reject invalid UUID', () => {
      expect(createValuationSchema.safeParse({ ...valid, playerId: 'bad' }).success).toBe(false);
    });
  });
});
