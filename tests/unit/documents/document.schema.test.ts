import {
  createDocumentSchema,
  updateDocumentSchema,
  documentQuerySchema,
} from '../../../src/modules/documents/document.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Document Schemas', () => {
  describe('createDocumentSchema', () => {
    const valid = { name: 'Passport Scan', fileUrl: '/uploads/doc.pdf' };

    it('should accept valid input', () => {
      expect(createDocumentSchema.safeParse(valid).success).toBe(true);
    });
    it('should reject empty name', () => {
      expect(createDocumentSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
    });
    it('should reject missing fileUrl', () => {
      expect(createDocumentSchema.safeParse({ name: 'Test' }).success).toBe(false);
    });
    it('should default type to Other', () => {
      expect(createDocumentSchema.parse(valid).type).toBe('Other');
    });
    it('should default status to Active', () => {
      expect(createDocumentSchema.parse(valid).status).toBe('Active');
    });
    it('should reject invalid entityType', () => {
      expect(createDocumentSchema.safeParse({ ...valid, entityType: 'Unknown' }).success).toBe(false);
    });
    it('should accept valid entityType', () => {
      expect(createDocumentSchema.safeParse({ ...valid, entityType: 'Player', entityId: UUID }).success).toBe(true);
    });
  });

  describe('documentQuerySchema', () => {
    it('should default sort to created_at', () => {
      expect(documentQuerySchema.parse({}).sort).toBe('created_at');
    });
    it('should reject invalid type filter', () => {
      expect(documentQuerySchema.safeParse({ type: 'Invalid' }).success).toBe(false);
    });
  });
});
