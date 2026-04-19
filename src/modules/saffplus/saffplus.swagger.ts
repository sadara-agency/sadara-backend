/**
 * @swagger
 * tags:
 *   - name: SAFF+
 *     description: SAFF+ data provider — Saudi football competitions, clubs, standings, and matches
 *
 * /saffplus/discover:
 *   get:
 *     tags: [SAFF+]
 *     summary: Discover available SAFF+ competitions and leagues
 *     description: Fetches the discovery endpoint from the SAFF+ provider to list all available data sources.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Discovery data from SAFF+ provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       502: { description: SAFF+ provider unreachable }
 *
 * /saffplus/competitions:
 *   get:
 *     tags: [SAFF+]
 *     summary: List all SAFF+ competitions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of competitions from SAFF+ provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *
 * /saffplus/clubs:
 *   get:
 *     tags: [SAFF+]
 *     summary: List all SAFF+ clubs / teams
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of clubs from SAFF+ provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *
 * /saffplus/competitions/{competitionId}/standings:
 *   get:
 *     tags: [SAFF+]
 *     summary: Get standings for a SAFF+ competition
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema: { type: string }
 *         description: SAFF+ competition identifier
 *     responses:
 *       200:
 *         description: Standings table for the competition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       404: { description: Competition not found }
 *
 * /saffplus/competitions/{competitionId}/matches:
 *   get:
 *     tags: [SAFF+]
 *     summary: Get matches for a SAFF+ competition
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema: { type: string }
 *         description: SAFF+ competition identifier
 *     responses:
 *       200:
 *         description: List of matches for the competition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       404: { description: Competition not found }
 *
 * /saffplus/sync:
 *   post:
 *     tags: [SAFF+]
 *     summary: Sync Saudi league matches from SAFF+ into the local database
 *     description: >
 *       Triggers a sync for the specified leagues. Attempts the SAFF+ API first,
 *       falls back to the web scraper on API failure. This is an idempotent upsert
 *       operation — existing matches are updated, new ones are inserted.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leagueSlugs]
 *             properties:
 *               leagueSlugs:
 *                 type: array
 *                 items: { type: string }
 *                 example: ['saudi-pro-league', 'saudi-first-division']
 *     responses:
 *       200: { description: Sync completed — returns count of inserted and updated matches }
 *       502: { description: Both SAFF+ API and scraper fallback failed }
 */
