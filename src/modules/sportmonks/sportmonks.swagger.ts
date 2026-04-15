/**
 * @swagger
 * tags:
 *   - name: Sportmonks
 *     description: Sportmonks API integration — fixtures, leagues, and team mapping
 *
 * /sportmonks/fixtures:
 *   get:
 *     tags: [Sportmonks]
 *     summary: Get fixtures from Sportmonks
 *     description: Fetches upcoming and recent fixtures from the Sportmonks API.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: leagueId
 *         schema: { type: integer }
 *       - in: query
 *         name: teamId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of fixtures from Sportmonks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       502: { description: Sportmonks API unreachable }
 *
 * /sportmonks/import:
 *   post:
 *     tags: [Sportmonks]
 *     summary: Import fixtures from Sportmonks into the local matches table
 *     description: >
 *       Upserts fixtures fetched from Sportmonks into the local database.
 *       Matches are keyed by Sportmonks fixture ID to avoid duplicates.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Import complete — returns count of inserted and updated records }
 *       502: { description: Sportmonks API unreachable }
 *
 * /sportmonks/leagues:
 *   get:
 *     tags: [Sportmonks]
 *     summary: Get leagues available in Sportmonks
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of leagues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *
 * /sportmonks/team-maps:
 *   get:
 *     tags: [Sportmonks]
 *     summary: Get Sportmonks team → local club mappings
 *     description: Returns all current mappings between Sportmonks team IDs and local Club records.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of team mappings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sportmonksTeamId: { type: integer }
 *                       sportmonksName: { type: string }
 *                       clubId: { type: string, format: uuid, nullable: true }
 *                       clubName: { type: string, nullable: true }
 *
 * /sportmonks/team-maps/{sportmonksTeamId}/map:
 *   patch:
 *     tags: [Sportmonks]
 *     summary: Map a Sportmonks team to a local Club
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sportmonksTeamId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clubId]
 *             properties:
 *               clubId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Mapping saved }
 *       404: { description: Club or Sportmonks team not found }
 *
 * /sportmonks/teams/search:
 *   get:
 *     tags: [Sportmonks]
 *     summary: Search for teams in Sportmonks by name
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Team name search query
 *     responses:
 *       200:
 *         description: Matching teams from Sportmonks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *
 * /sportmonks/test-connection:
 *   post:
 *     tags: [Sportmonks]
 *     summary: Test the Sportmonks API connection and token validity
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Connection OK — returns rate limit and plan info }
 *       502: { description: Connection failed or invalid API token }
 */
