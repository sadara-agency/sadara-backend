/**
 * @swagger
 * tags:
 *   - name: Player Care
 *     description: Player care case management (referrals, medical, wellbeing)
 *
 * /playercare:
 *   get:
 *     tags: [Player Care]
 *     summary: List player care cases (with filters & pagination)
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
 *         schema: { type: string, enum: [Open, InProgress, Closed] }
 *       - in: query
 *         name: caseType
 *         schema: { type: string, enum: [Referral, Medical, Wellbeing, Legal, Disciplinary, Other] }
 *     responses:
 *       200:
 *         description: Paginated list of player care cases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Player Care]
 *     summary: Create a player care case
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, caseType, title]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               caseType: { type: string, enum: [Referral, Medical, Wellbeing, Legal, Disciplinary, Other] }
 *               title: { type: string, example: 'Contract dispute' }
 *               description: { type: string }
 *               priority: { type: string, enum: [Low, Medium, High, Urgent] }
 *               assignedTo: { type: string, format: uuid }
 *     responses:
 *       201: { description: Case created }
 *
 * /playercare/medical:
 *   post:
 *     tags: [Player Care]
 *     summary: Create a medical player care case
 *     description: Specialised creation endpoint for medical cases — auto-links to injury engine if applicable.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, title]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               title: { type: string, example: 'Hamstring strain follow-up' }
 *               description: { type: string }
 *               injuryId: { type: string, format: uuid }
 *               priority: { type: string, enum: [Low, Medium, High, Urgent] }
 *     responses:
 *       201: { description: Medical case created }
 *
 * /playercare/stats:
 *   get:
 *     tags: [Player Care]
 *     summary: Get player care aggregate statistics (Admin, Manager, Executive)
 *     description: Returns org-wide case counts by status and type. Restricted to elevated roles.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Aggregate stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     byStatus: { type: object }
 *                     byType: { type: object }
 *       403: { description: Admin, Manager, or Executive role required }
 *
 * /playercare/player/{playerId}/timeline:
 *   get:
 *     tags: [Player Care]
 *     summary: Get chronological case timeline for a player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ordered list of care events for the player
 *       404: { description: Player not found }
 *
 * /playercare/{id}:
 *   get:
 *     tags: [Player Care]
 *     summary: Get player care case by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Case details }
 *       404: { description: Case not found }
 *   patch:
 *     tags: [Player Care]
 *     summary: Update a player care case
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
 *       200: { description: Case updated }
 *   delete:
 *     tags: [Player Care]
 *     summary: Delete a player care case
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Case deleted }
 *
 * /playercare/{id}/status:
 *   patch:
 *     tags: [Player Care]
 *     summary: Update the status of a player care case
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
 *               status: { type: string, enum: [Open, InProgress, Closed] }
 *               closureNotes: { type: string, description: 'Required when closing a case' }
 *     responses:
 *       200: { description: Status updated }
 *       422: { description: Closure notes required when status is Closed }
 */
