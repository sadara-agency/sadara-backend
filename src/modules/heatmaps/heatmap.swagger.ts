/**
 * @swagger
 * tags:
 *   - name: Heatmaps
 *     description: Player positional heatmap data and aggregations
 *
 * /heatmaps/data:
 *   post:
 *     tags: [Heatmaps]
 *     summary: Save positional tracking data for a player/match
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, positions]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               matchId: { type: string, format: uuid, nullable: true }
 *               positions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [x, y, timestamp]
 *                   properties:
 *                     x: { type: number, description: 0-100 normalized }
 *                     y: { type: number, description: 0-100 normalized }
 *                     timestamp: { type: number, description: seconds from kickoff }
 *               durationSeconds: { type: integer, nullable: true }
 *               coordinateSystem: { type: string, enum: [normalized_0_100, meters] }
 *               half: { type: string, enum: [first, second], nullable: true }
 *               source: { type: string, enum: [manual, sportmonks, upload, api] }
 *               replace: { type: boolean }
 *     responses:
 *       201: { description: Heatmap data saved }
 *       404: { description: Player or match not found }
 *       409: { description: Heatmap already exists for (player, match, half) }
 *       422: { description: Coordinates out of range }
 *
 * /heatmaps/player/{playerId}:
 *   get:
 *     tags: [Heatmaps]
 *     summary: List per-match heatmaps for a player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: matchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: half
 *         schema: { type: string, enum: [first, second] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: List of heatmap records (with precomputed grids) }
 *
 * /heatmaps/player/{playerId}/aggregate:
 *   get:
 *     tags: [Heatmaps]
 *     summary: Aggregate density grid across all matches for a player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: half
 *         schema: { type: string, enum: [first, second] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Aggregated 60x40 grid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 playerId: { type: string }
 *                 matchCount: { type: integer }
 *                 totalSamples: { type: integer }
 *                 gridWidth: { type: integer }
 *                 gridHeight: { type: integer }
 *                 grid:
 *                   type: array
 *                   items:
 *                     type: array
 *                     items: { type: integer }
 *
 * /heatmaps/match/{matchId}:
 *   get:
 *     tags: [Heatmaps]
 *     summary: List heatmaps for all players in a single match
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of heatmap records for the match }
 *
 * /heatmaps/{id}:
 *   get:
 *     tags: [Heatmaps]
 *     summary: Get a single heatmap record (with raw positions)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Heatmap record }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Heatmaps]
 *     summary: Delete a heatmap record (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       404: { description: Not found }
 */
export {};
