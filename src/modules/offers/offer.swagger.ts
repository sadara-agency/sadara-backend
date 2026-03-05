/**
 * @swagger
 * tags:
 *   - name: Offers
 *     description: Transfer & loan offer management and negotiation tracking
 *
 * /offers:
 *   get:
 *     tags: [Offers]
 *     summary: List offers with pagination & filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [New, Under Review, Negotiation, Closed] }
 *       - in: query
 *         name: offerType
 *         schema: { type: string, enum: [Transfer, Loan] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated offer list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Offer' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Offers]
 *     summary: Create a new offer (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               fromClubId: { type: string, format: uuid }
 *               toClubId: { type: string, format: uuid }
 *               offerType: { type: string, enum: [Transfer, Loan], default: Transfer }
 *               transferFee: { type: number, minimum: 0 }
 *               salaryOffered: { type: number, minimum: 0 }
 *               contractYears: { type: integer, minimum: 1, maximum: 10 }
 *               agentFee: { type: number, minimum: 0 }
 *               feeCurrency: { type: string, enum: [SAR, USD, EUR], default: SAR }
 *               conditions:
 *                 type: array
 *                 items: { type: object }
 *               deadline: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Offer created }
 *       422: { description: Validation error }
 *
 * /offers/{id}:
 *   get:
 *     tags: [Offers]
 *     summary: Get offer by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Offer details with player and club info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Offer' }
 *       404: { description: Offer not found }
 *   patch:
 *     tags: [Offers]
 *     summary: Update offer (Admin/Manager)
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
 *               transferFee: { type: number }
 *               salaryOffered: { type: number }
 *               contractYears: { type: integer }
 *               agentFee: { type: number }
 *               deadline: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Offer updated }
 *   delete:
 *     tags: [Offers]
 *     summary: Delete offer (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Offer deleted }
 *
 * /offers/player/{playerId}:
 *   get:
 *     tags: [Offers]
 *     summary: Get offers for a specific player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of offers for the player }
 *
 * /offers/{id}/status:
 *   patch:
 *     tags: [Offers]
 *     summary: Update offer status (Admin/Manager)
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
 *               status: { type: string, enum: [New, Under Review, Negotiation, Closed] }
 *               counterOffer: { type: object }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Offer status updated }
 *
 * /offers/{id}/convert:
 *   post:
 *     tags: [Offers]
 *     summary: Convert accepted offer to contract (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: Contract created from offer }
 *       400: { description: Offer not in acceptable state for conversion }
 */
