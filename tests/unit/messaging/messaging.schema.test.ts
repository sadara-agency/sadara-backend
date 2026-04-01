import {
  createConversationSchema,
  sendMessageSchema,
  updateConversationSchema,
  addParticipantsSchema,
  conversationQuerySchema,
  messageQuerySchema,
  searchMessagesSchema,
} from '../../../src/modules/messaging/messaging.validation';

const UUID = '550e8400-e29b-41d4-a716-446655440001';
const UUID2 = '550e8400-e29b-41d4-a716-446655440002';

describe('Messaging Schemas', () => {
  describe('createConversationSchema', () => {
    it('should accept valid direct conversation', () => {
      expect(createConversationSchema.safeParse({
        type: 'direct',
        participantIds: [UUID],
      }).success).toBe(true);
    });
    it('should default type to direct', () => {
      expect(createConversationSchema.parse({
        participantIds: [UUID],
      }).type).toBe('direct');
    });
    it('should accept valid group conversation with title', () => {
      expect(createConversationSchema.safeParse({
        type: 'group',
        title: 'Team Chat',
        participantIds: [UUID, UUID2],
      }).success).toBe(true);
    });
    it('should reject group without title', () => {
      expect(createConversationSchema.safeParse({
        type: 'group',
        participantIds: [UUID],
      }).success).toBe(false);
    });
    it('should reject empty participantIds', () => {
      expect(createConversationSchema.safeParse({
        type: 'direct',
        participantIds: [],
      }).success).toBe(false);
    });
    it('should reject invalid UUID in participantIds', () => {
      expect(createConversationSchema.safeParse({
        type: 'direct',
        participantIds: ['bad-uuid'],
      }).success).toBe(false);
    });
    it('should reject invalid type', () => {
      expect(createConversationSchema.safeParse({
        type: 'channel',
        participantIds: [UUID],
      }).success).toBe(false);
    });
    it('should accept optional titleAr', () => {
      expect(createConversationSchema.safeParse({
        type: 'group',
        title: 'Team',
        titleAr: 'فريق',
        participantIds: [UUID],
      }).success).toBe(true);
    });
  });

  describe('sendMessageSchema', () => {
    it('should accept valid message', () => {
      expect(sendMessageSchema.safeParse({ content: 'Hello' }).success).toBe(true);
    });
    it('should reject empty content', () => {
      expect(sendMessageSchema.safeParse({ content: '' }).success).toBe(false);
    });
    it('should reject content over 5000 chars', () => {
      expect(sendMessageSchema.safeParse({ content: 'x'.repeat(5001) }).success).toBe(false);
    });
    it('should accept optional contentAr', () => {
      expect(sendMessageSchema.safeParse({ content: 'Hi', contentAr: 'مرحبا' }).success).toBe(true);
    });
  });

  describe('updateConversationSchema', () => {
    it('should accept partial update', () => {
      expect(updateConversationSchema.safeParse({ title: 'New Name' }).success).toBe(true);
    });
    it('should accept empty update', () => {
      expect(updateConversationSchema.safeParse({}).success).toBe(true);
    });
    it('should reject title over 255 chars', () => {
      expect(updateConversationSchema.safeParse({ title: 'x'.repeat(256) }).success).toBe(false);
    });
  });

  describe('addParticipantsSchema', () => {
    it('should accept valid userIds', () => {
      expect(addParticipantsSchema.safeParse({ userIds: [UUID] }).success).toBe(true);
    });
    it('should reject empty userIds', () => {
      expect(addParticipantsSchema.safeParse({ userIds: [] }).success).toBe(false);
    });
  });

  describe('conversationQuerySchema', () => {
    it('should default page to 1', () => {
      expect(conversationQuerySchema.parse({}).page).toBe(1);
    });
    it('should default limit to 20', () => {
      expect(conversationQuerySchema.parse({}).limit).toBe(20);
    });
    it('should default archived to false', () => {
      expect(conversationQuerySchema.parse({}).archived).toBe(false);
    });
  });

  describe('messageQuerySchema', () => {
    it('should default page to 1', () => {
      expect(messageQuerySchema.parse({}).page).toBe(1);
    });
    it('should default limit to 50', () => {
      expect(messageQuerySchema.parse({}).limit).toBe(50);
    });
    it('should accept optional before cursor', () => {
      expect(messageQuerySchema.safeParse({ before: '2026-04-01T00:00:00Z' }).success).toBe(true);
    });
  });

  describe('searchMessagesSchema', () => {
    it('should accept valid search query', () => {
      expect(searchMessagesSchema.safeParse({ q: 'hello' }).success).toBe(true);
    });
    it('should reject empty query', () => {
      expect(searchMessagesSchema.safeParse({ q: '' }).success).toBe(false);
    });
    it('should default limit to 20', () => {
      expect(searchMessagesSchema.parse({ q: 'test' }).limit).toBe(20);
    });
  });
});
