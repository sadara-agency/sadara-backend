/**
 * @swagger
 * tags:
 *   - name: Messaging
 *     description: Real-time messaging — conversations, messages, typing indicators
 *
 * /messaging:
 *   get:
 *     tags: [Messaging]
 *     summary: List conversations for the current user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: archived
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Paginated list of conversations with unread counts and last message
 *   post:
 *     tags: [Messaging]
 *     summary: Create a new conversation (direct or group)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [participantIds]
 *             properties:
 *               type: { type: string, enum: [direct, group], default: direct }
 *               title: { type: string, maxLength: 255, description: Required for group conversations }
 *               titleAr: { type: string, maxLength: 255 }
 *               participantIds: { type: array, items: { type: string, format: uuid }, minItems: 1, maxItems: 50 }
 *     responses:
 *       201: { description: Conversation created (or existing direct conversation returned) }
 *
 * /messaging/search:
 *   get:
 *     tags: [Messaging]
 *     summary: Full-text search across messages in user's conversations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 1, maxLength: 200 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Search results with message content and conversation context }
 *
 * /messaging/unread-count:
 *   get:
 *     tags: [Messaging]
 *     summary: Get total unread message count across all conversations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Total unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object, properties: { total: { type: integer } } }
 *
 * /messaging/{conversationId}:
 *   patch:
 *     tags: [Messaging]
 *     summary: Update conversation (rename group)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, maxLength: 255 }
 *               titleAr: { type: string, maxLength: 255 }
 *     responses:
 *       200: { description: Conversation updated }
 *       400: { description: Cannot rename a direct conversation }
 *
 * /messaging/{conversationId}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: Get messages in a conversation (paginated, newest first)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: before
 *         schema: { type: string, format: date-time }
 *         description: Cursor for infinite scroll — fetch messages before this timestamp
 *     responses:
 *       200: { description: Paginated messages with sender info }
 *       403: { description: Not a participant }
 *   post:
 *     tags: [Messaging]
 *     summary: Send a message in a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, minLength: 1, maxLength: 5000 }
 *               contentAr: { type: string, maxLength: 5000 }
 *     responses:
 *       201: { description: Message sent and delivered via SSE to participants }
 *       403: { description: Not a participant }
 *
 * /messaging/{conversationId}/read:
 *   patch:
 *     tags: [Messaging]
 *     summary: Mark conversation as read (updates last_read_at, sends read receipt via SSE)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Read receipt recorded }
 *
 * /messaging/{conversationId}/archive:
 *   patch:
 *     tags: [Messaging]
 *     summary: Archive a conversation (per-user, hides from default list)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Conversation archived }
 *
 * /messaging/{conversationId}/unarchive:
 *   patch:
 *     tags: [Messaging]
 *     summary: Unarchive a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Conversation unarchived }
 *
 * /messaging/{conversationId}/mute:
 *   patch:
 *     tags: [Messaging]
 *     summary: Toggle mute on a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Mute toggled }
 *
 * /messaging/{conversationId}/participants:
 *   post:
 *     tags: [Messaging]
 *     summary: Add participants to a group conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds: { type: array, items: { type: string, format: uuid }, minItems: 1, maxItems: 50 }
 *     responses:
 *       200: { description: Participants added }
 *       400: { description: Cannot add participants to a direct conversation }
 *
 * /messaging/{conversationId}/participants/{userId}:
 *   delete:
 *     tags: [Messaging]
 *     summary: Remove a participant from a group conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Participant removed }
 *       400: { description: Cannot remove participants from a direct conversation }
 *
 * /messaging/{conversationId}/typing:
 *   post:
 *     tags: [Messaging]
 *     summary: Broadcast typing indicator to other participants (ephemeral, no DB storage)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Typing indicator broadcast via SSE }
 */
