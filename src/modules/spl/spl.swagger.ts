/**
 * @swagger
 * tags:
 *   - name: SPL
 *     description: Saudi Pro League data sync
 *
 * /spl/registry:
 *   get:
 *     tags: [SPL]
 *     summary: Get SPL registry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Registry data }
 *
 * /spl/sync-status:
 *   get:
 *     tags: [SPL]
 *     summary: Get sync status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sync status }
 *
 * /spl/sync/player:
 *   post:
 *     tags: [SPL]
 *     summary: Sync a single player from SPL (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId]
 *             properties:
 *               playerId: { type: string }
 *     responses:
 *       200: { description: Player synced }
 *
 * /spl/sync/team:
 *   post:
 *     tags: [SPL]
 *     summary: Sync a team from SPL (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teamId]
 *             properties:
 *               teamId: { type: string }
 *     responses:
 *       200: { description: Team synced }
 *
 * /spl/sync/all:
 *   post:
 *     tags: [SPL]
 *     summary: Sync all SPL data (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Full sync initiated }
 *
 * /spl/seed-club-ids:
 *   post:
 *     tags: [SPL]
 *     summary: Seed SPL club IDs (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Club IDs seeded }
 */
