/**
 * @swagger
 * tags:
 *   - name: Competitions
 *     description: Football competitions and club memberships
 *
 * /competitions:
 *   get:
 *     tags: [Competitions]
 *     summary: List competitions
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
 *         name: type
 *         schema: { type: string, enum: [League, Cup, Friendly, International] }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of competitions }
 *   post:
 *     tags: [Competitions]
 *     summary: Create a competition
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               nameAr: { type: string }
 *               type: { type: string, enum: [League, Cup, Friendly, International] }
 *               season: { type: string }
 *               country: { type: string }
 *               logoUrl: { type: string }
 *     responses:
 *       201: { description: Competition created }
 *
 * /competitions/club/{clubId}:
 *   get:
 *     tags: [Competitions]
 *     summary: Get competitions for a specific club
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *     responses:
 *       200: { description: Competitions the club participates in }
 *
 * /competitions/{id}:
 *   get:
 *     tags: [Competitions]
 *     summary: Get competition by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Competition details }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Competitions]
 *     summary: Update a competition
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
 *               name: { type: string }
 *               nameAr: { type: string }
 *               type: { type: string }
 *               season: { type: string }
 *               country: { type: string }
 *     responses:
 *       200: { description: Competition updated }
 *   delete:
 *     tags: [Competitions]
 *     summary: Delete a competition
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Competition deleted }
 *
 * /competitions/{id}/clubs:
 *   get:
 *     tags: [Competitions]
 *     summary: Get clubs enrolled in a competition
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of club entries }
 *   post:
 *     tags: [Competitions]
 *     summary: Add a club to a competition
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
 *             required: [clubId]
 *             properties:
 *               clubId: { type: string, format: uuid }
 *               season: { type: string }
 *     responses:
 *       201: { description: Club added to competition }
 *
 * /competitions/{id}/clubs/{clubId}:
 *   delete:
 *     tags: [Competitions]
 *     summary: Remove a club from a competition
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *     responses:
 *       200: { description: Club removed from competition }
 */
