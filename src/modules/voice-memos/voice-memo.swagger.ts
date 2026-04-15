/**
 * @swagger
 * tags:
 *   - name: Voice Memos
 *     description: Scouting voice memo recordings
 *
 * /voice-memos:
 *   get:
 *     tags: [Voice Memos]
 *     summary: List voice memos (with filters & pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: scoutId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: 'createdAt' }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: 'DESC' }
 *     responses:
 *       200:
 *         description: Paginated list of voice memos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       title: { type: string }
 *                       fileUrl: { type: string, format: uri }
 *                       duration: { type: number, description: 'Duration in seconds' }
 *                       playerId: { type: string, format: uuid, nullable: true }
 *                       createdBy: { type: string, format: uuid }
 *                       createdAt: { type: string, format: date-time }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Voice Memos]
 *     summary: Upload a voice memo
 *     description: Accepts a multipart audio file upload alongside memo metadata.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (mp3, m4a, wav, ogg)
 *               title: { type: string, example: 'Pre-match scouting note' }
 *               playerId: { type: string, format: uuid }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Voice memo uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     fileUrl: { type: string, format: uri }
 *
 * /voice-memos/{id}:
 *   delete:
 *     tags: [Voice Memos]
 *     summary: Delete a voice memo
 *     description: Deletes the record and removes the associated audio file from storage.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Voice memo deleted }
 *       404: { description: Voice memo not found }
 */
