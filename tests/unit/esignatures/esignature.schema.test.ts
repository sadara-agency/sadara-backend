/// <reference types="jest" />
import {
  createSignatureRequestSchema,
  submitSignatureSchema,
  declineSignatureSchema,
  signatureRequestQuerySchema,
} from '../../../src/modules/esignatures/esignature.validation';

describe('E-Signature Schemas', () => {
  describe('createSignatureRequestSchema', () => {
    const validInput = {
      documentId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Sign NDA Agreement',
      signers: [
        { signerType: 'internal', userId: '550e8400-e29b-41d4-a716-446655440001', stepOrder: 1 },
      ],
    };

    it('should accept valid input with defaults', () => {
      const result = createSignatureRequestSchema.parse(validInput);
      expect(result.signingOrder).toBe('sequential');
      expect(result.title).toBe('Sign NDA Agreement');
    });

    it('should accept full input with all optional fields', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        message: 'Please review and sign',
        signingOrder: 'parallel',
        dueDate: '2026-04-01',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing documentId', () => {
      const { documentId, ...rest } = validInput;
      const result = createSignatureRequestSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = createSignatureRequestSchema.safeParse({ ...validInput, title: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty signers array', () => {
      const result = createSignatureRequestSchema.safeParse({ ...validInput, signers: [] });
      expect(result.success).toBe(false);
    });

    it('should reject internal signer without userId', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        signers: [{ signerType: 'internal', stepOrder: 1 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject external signer without email', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        signers: [{ signerType: 'external', externalName: 'John', stepOrder: 1 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject external signer without name', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        signers: [{ signerType: 'external', externalEmail: 'j@x.com', stepOrder: 1 }],
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid external signer with name and email', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        signers: [
          { signerType: 'external', externalName: 'John', externalEmail: 'j@x.com', stepOrder: 1 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid signingOrder', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        signingOrder: 'random',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid documentId format', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        documentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject stepOrder less than 1', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        signers: [
          { signerType: 'internal', userId: '550e8400-e29b-41d4-a716-446655440001', stepOrder: 0 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should accept multiple signers', () => {
      const result = createSignatureRequestSchema.safeParse({
        ...validInput,
        signers: [
          { signerType: 'internal', userId: '550e8400-e29b-41d4-a716-446655440001', stepOrder: 1 },
          { signerType: 'external', externalName: 'Jane', externalEmail: 'jane@ext.com', stepOrder: 2 },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('submitSignatureSchema', () => {
    it('should accept valid digital signature', () => {
      const result = submitSignatureSchema.safeParse({
        signatureData: 'data:image/png;base64,iVBOR...',
        signingMethod: 'digital',
      });
      expect(result.success).toBe(true);
    });

    it('should accept upload method', () => {
      const result = submitSignatureSchema.safeParse({
        signatureData: '/uploads/sig.png',
        signingMethod: 'upload',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty signatureData', () => {
      const result = submitSignatureSchema.safeParse({
        signatureData: '',
        signingMethod: 'digital',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing signingMethod', () => {
      const result = submitSignatureSchema.safeParse({
        signatureData: 'some-data',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid signingMethod', () => {
      const result = submitSignatureSchema.safeParse({
        signatureData: 'some-data',
        signingMethod: 'wet',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('declineSignatureSchema', () => {
    it('should accept empty object', () => {
      const result = declineSignatureSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept reason', () => {
      const result = declineSignatureSchema.safeParse({ reason: 'Not authorized to sign' });
      expect(result.success).toBe(true);
    });

    it('should reject reason over 1000 chars', () => {
      const result = declineSignatureSchema.safeParse({ reason: 'x'.repeat(1001) });
      expect(result.success).toBe(false);
    });
  });

  describe('signatureRequestQuerySchema', () => {
    it('should apply defaults', () => {
      const result = signatureRequestQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('created_at');
      expect(result.order).toBe('desc');
    });

    it('should accept valid status filter', () => {
      const result = signatureRequestQuerySchema.safeParse({ status: 'Pending' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = signatureRequestQuerySchema.safeParse({ status: 'Unknown' });
      expect(result.success).toBe(false);
    });

    it('should coerce page to number', () => {
      const result = signatureRequestQuerySchema.parse({ page: '3' });
      expect(result.page).toBe(3);
    });

    it('should reject page less than 1', () => {
      const result = signatureRequestQuerySchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should accept limit over 100 (max is 500)', () => {
      const result = signatureRequestQuerySchema.safeParse({ limit: 101 });
      expect(result.success).toBe(true);
    });

    it('should accept valid sort fields', () => {
      for (const sort of ['created_at', 'updated_at', 'due_date']) {
        const result = signatureRequestQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      }
    });

    it('should accept documentId filter', () => {
      const result = signatureRequestQuerySchema.safeParse({
        documentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept search string', () => {
      const result = signatureRequestQuerySchema.safeParse({ search: 'NDA' });
      expect(result.success).toBe(true);
    });
  });
});
