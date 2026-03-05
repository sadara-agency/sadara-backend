/**
 * @swagger
 * tags:
 *   - name: Clearances
 *     description: Player clearance (مخالصة) management
 *
 * /clearances:
 *   get:
 *     tags: [Clearances]
 *     summary: List clearances (Admin/Manager/Legal)
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
 *         schema: { type: string, enum: [Processing, Completed, Cancelled] }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of clearances
 *   post:
 *     tags: [Clearances]
 *     summary: Create clearance (Admin/Manager/Legal)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, contractId, reason]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               contractId: { type: string, format: uuid }
 *               reason: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Clearance created }
 *
 * /clearances/{id}:
 *   get:
 *     tags: [Clearances]
 *     summary: Get clearance by ID (Admin/Manager/Legal)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Clearance details }
 *       404: { description: Not found }
 *   put:
 *     tags: [Clearances]
 *     summary: Update clearance (Admin/Manager/Legal)
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
 *               reason: { type: string }
 *               notes: { type: string }
 *               financialDetails: { type: object }
 *     responses:
 *       200: { description: Clearance updated }
 *   delete:
 *     tags: [Clearances]
 *     summary: Delete clearance (Admin only, Processing status only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Clearance deleted }
 *
 * /clearances/{id}/complete:
 *   post:
 *     tags: [Clearances]
 *     summary: Sign and complete clearance (Admin/Manager/Legal)
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
 *               signedByPlayer: { type: boolean }
 *               signedByClub: { type: boolean }
 *               completionNotes: { type: string }
 *     responses:
 *       200: { description: Clearance completed and signed }
 */
