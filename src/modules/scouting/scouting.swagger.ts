/**
 * @swagger
 * tags:
 *   - name: Scouting
 *     description: Player scouting pipeline — watchlist, screening, and decisions
 *
 * /scouting/summary:
 *   get:
 *     tags: [Scouting]
 *     summary: Pipeline summary (counts by stage)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pipeline stage counts }
 *
 * /scouting/watchlist:
 *   get:
 *     tags: [Scouting]
 *     summary: List watchlist entries (with filters)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated watchlist }
 *   post:
 *     tags: [Scouting]
 *     summary: Add player to watchlist (Admin/Manager/Analyst)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerName]
 *             properties:
 *               playerName: { type: string }
 *               position: { type: string }
 *               club: { type: string }
 *               nationality: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Added to watchlist }
 *
 * /scouting/watchlist/{id}:
 *   get:
 *     tags: [Scouting]
 *     summary: Get watchlist entry by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Watchlist entry details }
 *   patch:
 *     tags: [Scouting]
 *     summary: Update watchlist entry (Admin/Manager/Analyst)
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
 *               playerName: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Entry updated }
 *   delete:
 *     tags: [Scouting]
 *     summary: Remove from watchlist (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Entry removed }
 *
 * /scouting/watchlist/{id}/status:
 *   patch:
 *     tags: [Scouting]
 *     summary: Update watchlist status (Admin/Manager)
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
 *               status: { type: string }
 *     responses:
 *       200: { description: Status updated }
 *
 * /scouting/screening:
 *   post:
 *     tags: [Scouting]
 *     summary: Create screening case (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [watchlistId]
 *             properties:
 *               watchlistId: { type: string, format: uuid }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Screening created }
 *
 * /scouting/screening/{id}:
 *   get:
 *     tags: [Scouting]
 *     summary: Get screening case
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Screening details }
 *   patch:
 *     tags: [Scouting]
 *     summary: Update screening case (Admin/Manager/Analyst)
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
 *               notes: { type: string }
 *               technicalRating: { type: number }
 *               tacticalRating: { type: number }
 *     responses:
 *       200: { description: Screening updated }
 *
 * /scouting/screening/{id}/pack-ready:
 *   patch:
 *     tags: [Scouting]
 *     summary: Mark screening pack as ready (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Pack marked as ready }
 *
 * /scouting/screening/{id}/pdf:
 *   get:
 *     tags: [Scouting]
 *     summary: Generate scouting pack PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *
 * /scouting/decisions:
 *   post:
 *     tags: [Scouting]
 *     summary: Create selection decision (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [screeningId, decision]
 *             properties:
 *               screeningId: { type: string, format: uuid }
 *               decision: { type: string, enum: [Proceed, Reject, Hold] }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Decision created }
 *
 * /scouting/decisions/{id}:
 *   get:
 *     tags: [Scouting]
 *     summary: Get decision by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Decision details }
 */
