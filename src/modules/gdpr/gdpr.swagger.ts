/**
 * @swagger
 * tags:
 *   - name: GDPR
 *     description: GDPR compliance — data export and anonymization (Admin only)
 *
 * /gdpr/players/{id}/export:
 *   get:
 *     tags: [GDPR]
 *     summary: Export all player data (Right to Access)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Complete player data export
 *       403: { description: Admin role required }
 *       404: { description: Player not found }
 *
 * /gdpr/players/{id}/anonymize:
 *   post:
 *     tags: [GDPR]
 *     summary: Anonymize player data (Right to Erasure)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Player ID
 *     responses:
 *       200:
 *         description: Player data anonymized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     anonymizedTables: { type: array, items: { type: string } }
 *       403: { description: Admin role required }
 *       404: { description: Player not found }
 */
