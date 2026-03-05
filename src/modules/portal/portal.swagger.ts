/**
 * @swagger
 * tags:
 *   - name: Portal
 *     description: Player self-service portal and invite management
 *
 * /portal/register:
 *   post:
 *     tags: [Portal]
 *     summary: Complete registration via invite token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Registration complete }
 *       400: { description: Invalid or expired token }
 *
 * /portal/me:
 *   get:
 *     tags: [Portal]
 *     summary: Get my profile (Player only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player profile }
 *   patch:
 *     tags: [Portal]
 *     summary: Update my profile (Player only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone: { type: string }
 *               guardianName: { type: string }
 *               guardianPhone: { type: string }
 *               heightCm: { type: number }
 *               weightKg: { type: number }
 *     responses:
 *       200: { description: Profile updated }
 *
 * /portal/injuries:
 *   get:
 *     tags: [Portal]
 *     summary: Get my injuries (Player only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player injuries }
 *
 * /portal/schedule:
 *   get:
 *     tags: [Portal]
 *     summary: Get my schedule (Player only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player schedule }
 *
 * /portal/documents:
 *   get:
 *     tags: [Portal]
 *     summary: Get my documents (Player only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player documents }
 *
 * /portal/documents/upload:
 *   post:
 *     tags: [Portal]
 *     summary: Upload a document (Player only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201: { description: Document uploaded }
 *
 * /portal/contracts:
 *   get:
 *     tags: [Portal]
 *     summary: Get my contracts (Player only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player contracts }
 *
 * /portal/contracts/{id}/sign:
 *   post:
 *     tags: [Portal]
 *     summary: Sign a contract (Player only)
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
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [sign_digital, sign_upload] }
 *               signatureData: { type: string }
 *               signedDocumentUrl: { type: string }
 *     responses:
 *       200: { description: Contract signed }
 *
 * /portal/development:
 *   get:
 *     tags: [Portal]
 *     summary: Get my development data (Player only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Development data }
 *
 * /portal/stats:
 *   get:
 *     tags: [Portal]
 *     summary: Get my stats (Player only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player stats }
 *
 * /portal/invite:
 *   post:
 *     tags: [Portal]
 *     summary: Generate invite link for a player (Admin/Manager)
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
 *     responses:
 *       200: { description: Invite link generated }
 */
