/**
 * @swagger
 * tags:
 *   - name: Matches
 *     description: Match CRUD, calendar, player assignments, stats, and analysis
 *
 * /matches:
 *   get:
 *     tags: [Matches]
 *     summary: List matches with pagination & filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [upcoming, live, completed, cancelled] }
 *       - in: query
 *         name: competition
 *         schema: { type: string }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: matchDate }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated match list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Match' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Matches]
 *     summary: Create a new match (Admin/Manager/Coach)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchDate]
 *             properties:
 *               homeClubId: { type: string, format: uuid }
 *               awayClubId: { type: string, format: uuid }
 *               competition: { type: string, example: 'Saudi Pro League' }
 *               season: { type: string, example: '2024-2025' }
 *               matchDate: { type: string, format: date-time }
 *               venue: { type: string }
 *               status: { type: string, enum: [upcoming, live, completed, cancelled], default: upcoming }
 *               homeScore: { type: integer, minimum: 0 }
 *               awayScore: { type: integer, minimum: 0 }
 *               attendance: { type: integer, minimum: 0 }
 *               referee: { type: string }
 *               broadcast: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Match created }
 *
 * /matches/calendar:
 *   get:
 *     tags: [Matches]
 *     summary: Get matches for calendar view
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *         description: Month number (1-12)
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Calendar events for the given month }
 *
 * /matches/upcoming:
 *   get:
 *     tags: [Matches]
 *     summary: Get upcoming matches
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of upcoming matches }
 *
 * /matches/player/{playerId}:
 *   get:
 *     tags: [Matches]
 *     summary: Get matches for a specific player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated player matches }
 *
 * /matches/player/{playerId}/stats:
 *   get:
 *     tags: [Matches]
 *     summary: Get aggregate stats for a player across matches
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Aggregated player statistics }
 *
 * /matches/{id}:
 *   get:
 *     tags: [Matches]
 *     summary: Get match by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Match details with clubs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Match' }
 *       404: { description: Match not found }
 *   patch:
 *     tags: [Matches]
 *     summary: Update match (Admin/Manager/Coach)
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
 *               competition: { type: string }
 *               matchDate: { type: string, format: date-time }
 *               venue: { type: string }
 *               status: { type: string, enum: [upcoming, live, completed, cancelled] }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Match updated }
 *   delete:
 *     tags: [Matches]
 *     summary: Delete match (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Match deleted }
 *
 * /matches/{id}/score:
 *   patch:
 *     tags: [Matches]
 *     summary: Update match score (Admin/Manager/Analyst/Coach)
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
 *             required: [homeScore, awayScore]
 *             properties:
 *               homeScore: { type: integer, minimum: 0 }
 *               awayScore: { type: integer, minimum: 0 }
 *               status: { type: string, enum: [live, completed] }
 *     responses:
 *       200: { description: Score updated }
 *
 * /matches/{id}/status:
 *   patch:
 *     tags: [Matches]
 *     summary: Update match status (Admin/Manager/Coach)
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [upcoming, live, completed, cancelled] }
 *     responses:
 *       200: { description: Status updated }
 *
 * /matches/{id}/players:
 *   get:
 *     tags: [Matches]
 *     summary: Get players assigned to a match
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of match players with availability }
 *   post:
 *     tags: [Matches]
 *     summary: Assign players to a match (Admin/Manager/Coach)
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
 *             required: [players]
 *             properties:
 *               players:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [playerId]
 *                   properties:
 *                     playerId: { type: string, format: uuid }
 *                     availability: { type: string, enum: [starter, bench, injured, suspended, not_called], default: starter }
 *                     positionInMatch: { type: string }
 *                     minutesPlayed: { type: integer, minimum: 0 }
 *                     notes: { type: string }
 *     responses:
 *       200: { description: Players assigned }
 *
 * /matches/{id}/players/{playerId}:
 *   patch:
 *     tags: [Matches]
 *     summary: Update match player details (Admin/Manager/Coach)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availability: { type: string, enum: [starter, bench, injured, suspended, not_called] }
 *               positionInMatch: { type: string }
 *               minutesPlayed: { type: integer, minimum: 0 }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Match player updated }
 *   delete:
 *     tags: [Matches]
 *     summary: Remove player from match (Admin/Manager/Coach)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Player removed from match }
 *
 * /matches/{id}/stats:
 *   get:
 *     tags: [Matches]
 *     summary: Get all player stats for a match
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of player stats for the match }
 *   post:
 *     tags: [Matches]
 *     summary: Bulk upsert player stats (Admin/Manager/Analyst/Coach)
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
 *             required: [stats]
 *             properties:
 *               stats:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [playerId]
 *                   properties:
 *                     playerId: { type: string, format: uuid }
 *                     minutesPlayed: { type: integer }
 *                     goals: { type: integer }
 *                     assists: { type: integer }
 *                     shotsTotal: { type: integer }
 *                     shotsOnTarget: { type: integer }
 *                     passesTotal: { type: integer }
 *                     passesCompleted: { type: integer }
 *                     tacklesTotal: { type: integer }
 *                     interceptions: { type: integer }
 *                     yellowCards: { type: integer }
 *                     redCards: { type: integer }
 *                     rating: { type: number, minimum: 0, maximum: 10 }
 *     responses:
 *       200: { description: Stats upserted }
 *
 * /matches/{id}/stats/{playerId}:
 *   patch:
 *     tags: [Matches]
 *     summary: Update individual player stats (Admin/Manager/Analyst/Coach)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minutesPlayed: { type: integer }
 *               goals: { type: integer }
 *               assists: { type: integer }
 *               rating: { type: number }
 *     responses:
 *       200: { description: Player stats updated }
 *   delete:
 *     tags: [Matches]
 *     summary: Delete player stats from match (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Player stats deleted }
 *
 * /matches/{id}/analysis:
 *   get:
 *     tags: [Matches]
 *     summary: List analyses for a match
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of match analyses }
 *   post:
 *     tags: [Matches]
 *     summary: Create match analysis (Admin/Manager/Analyst/Coach)
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
 *             required: [type, title, content]
 *             properties:
 *               type: { type: string, enum: [pre-match, post-match, tactical] }
 *               title: { type: string, maxLength: 500 }
 *               content: { type: string }
 *               keyFindings:
 *                 type: array
 *                 items: { type: object }
 *               recommendedActions:
 *                 type: array
 *                 items: { type: string }
 *               rating: { type: number, minimum: 0, maximum: 10 }
 *     responses:
 *       201: { description: Analysis created }
 *
 * /matches/{id}/analysis/{analysisId}:
 *   get:
 *     tags: [Matches]
 *     summary: Get specific match analysis
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Analysis details }
 *       404: { description: Analysis not found }
 *   patch:
 *     tags: [Matches]
 *     summary: Update match analysis (Admin/Manager/Analyst/Coach)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [pre-match, post-match, tactical] }
 *               title: { type: string }
 *               content: { type: string }
 *               keyFindings: { type: array, items: { type: object } }
 *               recommendedActions: { type: array, items: { type: string } }
 *               rating: { type: number }
 *     responses:
 *       200: { description: Analysis updated }
 *
 * /matches/{id}/analysis/{analysisId}/publish:
 *   patch:
 *     tags: [Matches]
 *     summary: Publish match analysis (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: analysisId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Analysis published }
 */
