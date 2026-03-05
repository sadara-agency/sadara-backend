/**
 * @swagger
 * tags:
 *   - name: Notes
 *     description: Internal notes on players, contracts, etc.
 *
 * /notes:
 *   get:
 *     tags: [Notes]
 *     summary: List notes (with filters)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema: { type: string, example: player }
 *       - in: query
 *         name: entityId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of notes
 *   post:
 *     tags: [Notes]
 *     summary: Create a note
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content, entityType, entityId]
 *             properties:
 *               content: { type: string }
 *               entityType: { type: string, example: player }
 *               entityId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Note created }
 *
 * /notes/{id}:
 *   patch:
 *     tags: [Notes]
 *     summary: Update a note
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200: { description: Note updated }
 *   delete:
 *     tags: [Notes]
 *     summary: Delete a note
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Note deleted }
 */
