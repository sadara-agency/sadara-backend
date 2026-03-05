/**
 * @swagger
 * tags:
 *   - name: SAFF
 *     description: Saudi Arabian Football Federation data integration
 *
 * /saff/tournaments:
 *   get:
 *     tags: [SAFF]
 *     summary: List tournaments
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated tournaments }
 *
 * /saff/tournaments/seed:
 *   post:
 *     tags: [SAFF]
 *     summary: Seed tournaments (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tournaments seeded }
 *
 * /saff/fetch:
 *   post:
 *     tags: [SAFF]
 *     summary: Scrape data from SAFF (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tournamentId]
 *             properties:
 *               tournamentId: { type: string }
 *     responses:
 *       200: { description: Data fetched }
 *
 * /saff/standings:
 *   get:
 *     tags: [SAFF]
 *     summary: List standings
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Standings data }
 *
 * /saff/fixtures:
 *   get:
 *     tags: [SAFF]
 *     summary: List fixtures
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Fixtures data }
 *
 * /saff/team-maps:
 *   get:
 *     tags: [SAFF]
 *     summary: List team mappings
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Team mappings }
 *   post:
 *     tags: [SAFF]
 *     summary: Map SAFF team to Sadara club (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [saffTeamId, clubId]
 *             properties:
 *               saffTeamId: { type: string }
 *               clubId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Team mapped }
 *
 * /saff/import:
 *   post:
 *     tags: [SAFF]
 *     summary: Import SAFF data to Sadara (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tournamentId]
 *             properties:
 *               tournamentId: { type: string }
 *     responses:
 *       200: { description: Data imported }
 *
 * /saff/fetch-logos:
 *   post:
 *     tags: [SAFF]
 *     summary: Fetch team logos from SAFF (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logos fetched }
 *
 * /saff/stats:
 *   get:
 *     tags: [SAFF]
 *     summary: Get SAFF integration stats
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stats data }
 *
 * /saff/sync-status:
 *   get:
 *     tags: [SAFF]
 *     summary: Get sync status
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sync status }
 *
 * /saff/sync-now:
 *   post:
 *     tags: [SAFF]
 *     summary: Trigger manual sync (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sync triggered }
 */
