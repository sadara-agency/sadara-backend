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
 *
 * /saffplus/players/{saffPlayerId}/preview:
 *   get:
 *     tags: [SAFF+]
 *     summary: Preview a SAFF+ player profile without writing to DB
 *     description: >
 *       Fetches the player profile from saffplus.sa for the given saffPlayerId
 *       and returns the raw structured data. Read-only — nothing is stored.
 *       Use this to inspect SAFF+ data before running the sync endpoint.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: saffPlayerId
 *         required: true
 *         schema: { type: string }
 *         description: The SAFF+ player ID (the trailing path segment from saffplus.sa/ar/entity/player/:id)
 *     responses:
 *       200:
 *         description: SAFF+ player profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     saffPlayerId: { type: string }
 *                     nameEn: { type: string }
 *                     nameAr: { type: string }
 *                     position: { type: string, nullable: true }
 *                     dateOfBirth: { type: string, format: date, nullable: true }
 *                     nationality: { type: string, nullable: true }
 *                     photoUrl: { type: string, nullable: true }
 *                     teams: { type: array, items: { type: object } }
 *                     recentMatches: { type: array, items: { type: object } }
 *                     upcomingMatches: { type: array, items: { type: object } }
 *       404: { description: Player not found on SAFF+ }
 *       502: { description: SAFF+ provider unreachable }
 *
 * /saffplus/players/sync:
 *   post:
 *     tags: [SAFF+]
 *     summary: Enrich an existing Sadara player with SAFF+ profile data
 *     description: >
 *       Fetches the player's profile from saffplus.sa and enriches the existing
 *       Sadara player record. Never creates new players. Only fills null/empty
 *       fields unless overwrite=true. Links recent/upcoming matches only when
 *       SAFF+ returns an explicit lineup role. Sends a notification to all
 *       assigned staff and the initiator on completion.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sadaraPlayerId, saffPlayerId]
 *             properties:
 *               sadaraPlayerId:
 *                 type: string
 *                 format: uuid
 *                 description: The Sadara player UUID to enrich
 *               saffPlayerId:
 *                 type: string
 *                 description: >
 *                   The SAFF+ player ID or full URL
 *                   (e.g. "abc123" or "https://saffplus.sa/ar/entity/player/abc123")
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *                 description: When true, replaces existing non-null fields with SAFF+ values
 *     responses:
 *       200:
 *         description: Player enriched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     playerId: { type: string, format: uuid }
 *                     enriched: { type: array, items: { type: string }, description: Field names that were updated }
 *                     matchesLinked: { type: integer }
 *                     matchesSkipped: { type: integer }
 *                     clubsLinked: { type: integer }
 *                     clubsSkipped: { type: integer }
 *                     notifiedUserIds: { type: array, items: { type: string } }
 *       404: { description: Sadara player not found OR SAFF+ profile not found }
 *       422: { description: Validation error — invalid sadaraPlayerId or saffPlayerId }
 *       502: { description: SAFF+ provider unreachable }
 */
