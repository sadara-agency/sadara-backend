/**
 * @swagger
 * tags:
 *   - name: Approvals
 *     description: Approval workflow management
 *
 * /approvals:
 *   get:
 *     tags: [Approvals]
 *     summary: List approval requests
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of approval requests
 *
 * /approvals/stats:
 *   get:
 *     tags: [Approvals]
 *     summary: Get approval statistics
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Approval stats (pending, approved, rejected counts)
 *
 * /approvals/{id}/approve:
 *   patch:
 *     tags: [Approvals]
 *     summary: Approve a request (Admin/Manager)
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
 *               comment: { type: string }
 *     responses:
 *       200: { description: Request approved }
 *       403: { description: Admin/Manager role required }
 *       404: { description: Approval not found }
 *       409: { description: Already resolved }
 *
 * /approvals/{id}/reject:
 *   patch:
 *     tags: [Approvals]
 *     summary: Reject a request (Admin/Manager)
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
 *               comment: { type: string }
 *     responses:
 *       200: { description: Request rejected }
 *       403: { description: Admin/Manager role required }
 *       404: { description: Approval not found }
 *       409: { description: Already resolved }
 */
