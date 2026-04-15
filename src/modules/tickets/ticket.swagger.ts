/**
 * @swagger
 * tags:
 *   - name: Tickets
 *     description: Support ticket management
 *
 * /tickets:
 *   get:
 *     tags: [Tickets]
 *     summary: List tickets (with filters & pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Open, InProgress, Resolved, Closed, Cancelled] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [Low, Medium, High, Urgent] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: 'createdAt' }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC], default: 'DESC' }
 *     responses:
 *       200:
 *         description: Paginated list of tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Tickets]
 *     summary: Create a support ticket
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category]
 *             properties:
 *               title: { type: string, example: 'Cannot access contract documents' }
 *               description: { type: string }
 *               category: { type: string, example: 'Access' }
 *               priority: { type: string, enum: [Low, Medium, High, Urgent], default: 'Medium' }
 *               playerId: { type: string, format: uuid }
 *               assignedTo: { type: string, format: uuid }
 *     responses:
 *       201: { description: Ticket created }
 *
 * /tickets/{id}:
 *   get:
 *     tags: [Tickets]
 *     summary: Get ticket by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ticket details }
 *       404: { description: Ticket not found }
 *   patch:
 *     tags: [Tickets]
 *     summary: Update a ticket
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
 *               description: { type: string }
 *               priority: { type: string, enum: [Low, Medium, High, Urgent] }
 *               assignedTo: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ticket updated }
 *   delete:
 *     tags: [Tickets]
 *     summary: Delete a ticket
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Ticket deleted }
 *
 * /tickets/{id}/status:
 *   patch:
 *     tags: [Tickets]
 *     summary: Update ticket status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [Open, InProgress, Resolved, Closed, Cancelled] }
 *               resolutionNotes: { type: string }
 *     responses:
 *       200: { description: Status updated }
 *       422: { description: Invalid status transition }
 */
