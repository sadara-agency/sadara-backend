/**
 * @swagger
 * tags:
 *   - name: Audit
 *     description: Audit log access
 *
 * /audit:
 *   get:
 *     tags: [Audit]
 *     summary: List audit logs (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       403: { description: Admin/Manager role required }
 */
