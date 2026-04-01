import {
  createClearanceSchema,
  updateClearanceSchema,
  completeClearanceSchema,
  clearanceQuerySchema,
} from '../../../src/modules/clearances/clearance.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Clearance Schemas', () => {
  describe('createClearanceSchema', () => {
    const valid = { contractId: UUID, reason: 'End of contract', terminationDate: '2025-06-30' };

    it('should accept valid input', () => {
      expect(createClearanceSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject invalid UUID', () => {
      expect(createClearanceSchema.safeParse({ ...valid, contractId: 'bad' }).success).toBe(false);
    });
    it('should reject invalid date format', () => {
      expect(createClearanceSchema.safeParse({ ...valid, terminationDate: '30/06/2025' }).success).toBe(false);
    });
    it('should default hasOutstanding to false', () => {
      expect(createClearanceSchema.parse(valid).hasOutstanding).toBe(false);
    });
    it('should default outstandingCurrency to SAR', () => {
      expect(createClearanceSchema.parse(valid).outstandingCurrency).toBe('SAR');
    });
  });

  describe('completeClearanceSchema', () => {
    it('should accept sign_digital with signatureData', () => {
      expect(completeClearanceSchema.safeParse({ action: 'sign_digital', signatureData: 'base64data' }).success).toBe(true);
    });
    it('should reject sign_digital without signatureData', () => {
      expect(completeClearanceSchema.safeParse({ action: 'sign_digital' }).success).toBe(false);
    });
    it('should accept sign_upload with signedDocumentUrl', () => {
      expect(completeClearanceSchema.safeParse({ action: 'sign_upload', signedDocumentUrl: 'https://example.com/doc.pdf' }).success).toBe(true);
    });
    it('should accept complete action', () => {
      expect(completeClearanceSchema.safeParse({ action: 'complete' }).success).toBe(true);
    });
  });

  describe('clearanceQuerySchema', () => {
    it('should default page and limit', () => {
      const result = clearanceQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
