import {
  createNoteSchema,
  updateNoteSchema,
  noteQuerySchema,
} from '../../../src/modules/notes/note.schema';

const UUID = '550e8400-e29b-41d4-a716-446655440001';

describe('Note Schemas', () => {
  describe('createNoteSchema', () => {
    it('should accept valid note', () => {
      expect(createNoteSchema.safeParse({ ownerType: 'Player', ownerId: UUID, content: 'Test note' }).success).toBe(true);
    });
    it('should reject invalid ownerType', () => {
      expect(createNoteSchema.safeParse({ ownerType: 'User', ownerId: UUID, content: 'Test' }).success).toBe(false);
    });
    it('should reject empty content', () => {
      expect(createNoteSchema.safeParse({ ownerType: 'Player', ownerId: UUID, content: '' }).success).toBe(false);
    });
    it('should reject invalid UUID', () => {
      expect(createNoteSchema.safeParse({ ownerType: 'Club', ownerId: 'bad', content: 'x' }).success).toBe(false);
    });
  });

  describe('updateNoteSchema', () => {
    it('should accept valid content', () => {
      expect(updateNoteSchema.safeParse({ content: 'Updated' }).success).toBe(true);
    });
    it('should reject empty content', () => {
      expect(updateNoteSchema.safeParse({ content: '' }).success).toBe(false);
    });
  });

  describe('noteQuerySchema', () => {
    it('should default page and limit', () => {
      const result = noteQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
