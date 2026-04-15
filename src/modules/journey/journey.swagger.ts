/**
 * @swagger
 * tags:
 *   - name: Journey
 *     description: Player development journey stages management
 *
 * /journey:
 *   get:
 *     tags: [Journey]
 *     summary: List journey stages (with filters & pagination)
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
 *         name: status
 *         schema: { type: string, enum: [Planned, Active, Completed, Cancelled] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: 'order' }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: 'ASC' }
 *     responses:
 *       200:
 *         description: Paginated list of journey stages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Journey]
 *     summary: Create a journey stage
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, title, status]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               title: { type: string, example: 'Technical Assessment' }
 *               titleAr: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [Planned, Active, Completed, Cancelled] }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               order: { type: integer }
 *               milestones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title: { type: string }
 *                     completed: { type: boolean }
 *     responses:
 *       201: { description: Journey stage created }
 *
 * /journey/{id}:
 *   get:
 *     tags: [Journey]
 *     summary: Get journey stage by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Journey stage details }
 *       404: { description: Journey stage not found }
 *   patch:
 *     tags: [Journey]
 *     summary: Update a journey stage
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
 *               title: { type: string }
 *               titleAr: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [Planned, Active, Completed, Cancelled] }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               order: { type: integer }
 *               milestones: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Journey stage updated }
 *   delete:
 *     tags: [Journey]
 *     summary: Delete a journey stage
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Journey stage deleted }
 *
 * /journey/player/{playerId}:
 *   get:
 *     tags: [Journey]
 *     summary: Get all journey stages for a specific player
 *     description: Returns the full ordered journey timeline for a player. Requires package access.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ordered list of journey stages for the player
 *       403: { description: Package access denied for this module }
 *       404: { description: Player not found }
 *
 * /journey/reorder:
 *   post:
 *     tags: [Journey]
 *     summary: Reorder journey stages for a player
 *     description: Bulk-updates the `order` field for multiple stages. Requires package access.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, stages]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               stages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, order]
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     order: { type: integer }
 *     responses:
 *       200: { description: Stages reordered }
 */
