/**
 * @swagger
 * tags:
 *   - name: Tactical - KPIs
 *     description: Tactical KPI tracking and computation
 *   - name: Tactical - Set Pieces
 *     description: Set piece analysis and recording
 *   - name: Tactical - Reports
 *     description: Tactical analysis report generation
 *
 * /tactical/kpis:
 *   get:
 *     tags: [Tactical - KPIs]
 *     summary: List tactical KPIs (with filters & pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: kpiType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of tactical KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Tactical - KPIs]
 *     summary: Create a tactical KPI entry (manual)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, matchId, kpiType, value]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               matchId: { type: string, format: uuid }
 *               kpiType: { type: string, example: 'PassAccuracy' }
 *               value: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201: { description: KPI entry created }
 *
 * /tactical/kpis/compute:
 *   post:
 *     tags: [Tactical - KPIs]
 *     summary: Auto-compute tactical KPIs from match stats
 *     description: Calculates and stores KPIs automatically from existing match performance data.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchId]
 *             properties:
 *               matchId: { type: string, format: uuid }
 *               playerIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 description: Subset of players to compute for; omit to compute for all match players
 *     responses:
 *       200: { description: KPIs computed and stored }
 *
 * /tactical/kpis/{id}:
 *   get:
 *     tags: [Tactical - KPIs]
 *     summary: Get tactical KPI by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: KPI details }
 *       404: { description: KPI not found }
 *   patch:
 *     tags: [Tactical - KPIs]
 *     summary: Update a tactical KPI entry
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
 *               value: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200: { description: KPI updated }
 *   delete:
 *     tags: [Tactical - KPIs]
 *     summary: Delete a tactical KPI entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: KPI deleted }
 *
 * /tactical/kpis/player/{playerId}/match/{matchId}:
 *   get:
 *     tags: [Tactical - KPIs]
 *     summary: Get all KPIs for a player in a specific match
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: KPIs for the player-match combination }
 *
 * /tactical/kpis/player/{playerId}/trend:
 *   get:
 *     tags: [Tactical - KPIs]
 *     summary: Get KPI trend data for a player across matches
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: kpiType
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Trend series data for the player }
 *
 * /tactical/set-pieces:
 *   get:
 *     tags: [Tactical - Set Pieces]
 *     summary: List set piece records (with filters & pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [Corner, FreeKick, ThrowIn, Penalty, GoalKick] }
 *       - in: query
 *         name: outcome
 *         schema: { type: string, enum: [Goal, Shot, Cleared, Lost] }
 *     responses:
 *       200:
 *         description: Paginated list of set piece records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Tactical - Set Pieces]
 *     summary: Record a set piece event
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchId, type, outcome, minute]
 *             properties:
 *               matchId: { type: string, format: uuid }
 *               type: { type: string, enum: [Corner, FreeKick, ThrowIn, Penalty, GoalKick] }
 *               outcome: { type: string, enum: [Goal, Shot, Cleared, Lost] }
 *               minute: { type: integer }
 *               playerId: { type: string, format: uuid }
 *               notes: { type: string }
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   x: { type: number }
 *                   y: { type: number }
 *     responses:
 *       201: { description: Set piece recorded }
 *
 * /tactical/set-pieces/match/{matchId}/summary:
 *   get:
 *     tags: [Tactical - Set Pieces]
 *     summary: Get set piece summary for a match
 *     description: Aggregated counts and outcomes for all set pieces in a match.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Set piece summary statistics for the match }
 *
 * /tactical/set-pieces/{id}:
 *   get:
 *     tags: [Tactical - Set Pieces]
 *     summary: Get set piece record by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Set piece record }
 *       404: { description: Set piece not found }
 *   patch:
 *     tags: [Tactical - Set Pieces]
 *     summary: Update a set piece record
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
 *               type: { type: string }
 *               outcome: { type: string }
 *               minute: { type: integer }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Set piece updated }
 *   delete:
 *     tags: [Tactical - Set Pieces]
 *     summary: Delete a set piece record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Set piece deleted }
 *
 * /tactical/reports:
 *   get:
 *     tags: [Tactical - Reports]
 *     summary: List tactical reports (with filters & pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Draft, Published] }
 *     responses:
 *       200:
 *         description: Paginated list of tactical reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Tactical - Reports]
 *     summary: Create a tactical report
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchId, title]
 *             properties:
 *               matchId: { type: string, format: uuid }
 *               playerId: { type: string, format: uuid }
 *               title: { type: string, example: 'Match Analysis vs Al-Hilal' }
 *               summary: { type: string }
 *               sections: { type: array, items: { type: object } }
 *     responses:
 *       201: { description: Tactical report created }
 *
 * /tactical/reports/auto-generate:
 *   post:
 *     tags: [Tactical - Reports]
 *     summary: Auto-generate a tactical report from match data
 *     description: Compiles KPIs and set piece data into a structured report automatically.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matchId]
 *             properties:
 *               matchId: { type: string, format: uuid }
 *               playerId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Report auto-generated and saved as Draft }
 *
 * /tactical/reports/{id}:
 *   get:
 *     tags: [Tactical - Reports]
 *     summary: Get tactical report by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Report details }
 *       404: { description: Report not found }
 *   patch:
 *     tags: [Tactical - Reports]
 *     summary: Update a tactical report
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
 *               title: { type: string }
 *               summary: { type: string }
 *               sections: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Report updated }
 *   delete:
 *     tags: [Tactical - Reports]
 *     summary: Delete a tactical report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Report deleted }
 *
 * /tactical/reports/{id}/publish:
 *   post:
 *     tags: [Tactical - Reports]
 *     summary: Publish a tactical report
 *     description: Changes report status from Draft to Published, making it visible to relevant roles.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Report published }
 *       409: { description: Report is already published }
 */
