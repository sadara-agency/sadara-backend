/**
 * @swagger
 * tags:
 *   - name: Referrals
 *     description: Player referral tracking
 *
 * /referrals:
 *   get:
 *     tags: [Referrals]
 *     summary: List referrals (with filters)
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
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of referrals
 *   post:
 *     tags: [Referrals]
 *     summary: Create referral (Admin/Manager/Analyst)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerName, source]
 *             properties:
 *               playerName: { type: string }
 *               source: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Referral created }
 *
 * /referrals/{id}:
 *   get:
 *     tags: [Referrals]
 *     summary: Get referral by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Referral details }
 *   patch:
 *     tags: [Referrals]
 *     summary: Update referral (Admin/Manager)
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
 *               playerName: { type: string }
 *               source: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Referral updated }
 *   delete:
 *     tags: [Referrals]
 *     summary: Delete referral (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Referral deleted }
 *
 * /referrals/{id}/status:
 *   patch:
 *     tags: [Referrals]
 *     summary: Update referral status (Admin/Manager/Analyst)
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
 *               status: { type: string }
 *     responses:
 *       200: { description: Status updated }
 */
