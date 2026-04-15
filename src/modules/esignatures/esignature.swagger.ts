/**
 * @swagger
 * tags:
 *   - name: E-Signatures
 *     description: Electronic signature requests and signing workflow
 *
 * /esignatures:
 *   get:
 *     tags: [E-Signatures]
 *     summary: List signature requests (with filters & pagination)
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
 *         schema: { type: string, enum: [Pending, Completed, Declined, Cancelled, Expired] }
 *       - in: query
 *         name: documentId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of signature requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [E-Signatures]
 *     summary: Create a signature request
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [documentId, signers]
 *             properties:
 *               documentId: { type: string, format: uuid }
 *               title: { type: string, example: 'Contract signature request' }
 *               message: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               signers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, email]
 *                   properties:
 *                     name: { type: string }
 *                     email: { type: string, format: email }
 *                     userId: { type: string, format: uuid }
 *                     order: { type: integer }
 *     responses:
 *       201: { description: Signature request created }
 *
 * /esignatures/my-pending:
 *   get:
 *     tags: [E-Signatures]
 *     summary: Get signature requests pending the current user's signature
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of pending signature requests for the current user
 *
 * /esignatures/{id}:
 *   get:
 *     tags: [E-Signatures]
 *     summary: Get signature request by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Signature request details }
 *       404: { description: Signature request not found }
 *
 * /esignatures/{id}/cancel:
 *   post:
 *     tags: [E-Signatures]
 *     summary: Cancel a signature request
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Signature request cancelled }
 *       403: { description: Not authorised to cancel this request }
 *
 * /esignatures/{id}/audit:
 *   get:
 *     tags: [E-Signatures]
 *     summary: Get audit trail for a signature request
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Audit trail events for this request }
 *
 * /esignatures/{id}/signers/{signerId}/sign:
 *   post:
 *     tags: [E-Signatures]
 *     summary: Submit a signature (authenticated user)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: signerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signatureData]
 *             properties:
 *               signatureData: { type: string, description: 'Base64-encoded signature image or typed name' }
 *     responses:
 *       200: { description: Signature submitted }
 *
 * /esignatures/{id}/signers/{signerId}/decline:
 *   post:
 *     tags: [E-Signatures]
 *     summary: Decline a signature request (authenticated user)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: signerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Signature declined }
 *
 * /esignatures/{id}/signers/{signerId}/remind:
 *   post:
 *     tags: [E-Signatures]
 *     summary: Send a reminder to a signer
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: signerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Reminder sent }
 *
 * /esignatures/sign/{token}:
 *   get:
 *     tags: [E-Signatures]
 *     summary: View signature request by public token (no auth required)
 *     description: >
 *       Public endpoint used by external signers to view the document.
 *       Rate-limited to 10 requests/minute per IP to prevent token enumeration.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Signature request details for the signer }
 *       404: { description: Invalid or expired token }
 *   post:
 *     tags: [E-Signatures]
 *     summary: Submit a signature via public token (no auth required)
 *     description: Rate-limited to 10 requests/minute per IP.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [signatureData]
 *             properties:
 *               signatureData: { type: string }
 *     responses:
 *       200: { description: Signature submitted successfully }
 *       404: { description: Invalid or expired token }
 *
 * /esignatures/sign/{token}/decline:
 *   post:
 *     tags: [E-Signatures]
 *     summary: Decline a signature via public token (no auth required)
 *     description: Rate-limited to 10 requests/minute per IP.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Signature declined }
 *       404: { description: Invalid or expired token }
 */
