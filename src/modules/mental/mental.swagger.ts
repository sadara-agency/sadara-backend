/**
 * @swagger
 * tags:
 *   - name: Mental Health
 *     description: Mental wellness assessments and coaching templates (privacy-gated)
 *
 * /mental/templates:
 *   get:
 *     tags: [Mental Health]
 *     summary: List assessment templates
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: Filter by active/inactive templates
 *     responses:
 *       200: { description: List of mental assessment templates }
 *   post:
 *     tags: [Mental Health]
 *     summary: Create an assessment template (Coach/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, questions]
 *             properties:
 *               title: { type: string }
 *               titleAr: { type: string }
 *               description: { type: string }
 *               isActive: { type: boolean, default: true }
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text: { type: string }
 *                     textAr: { type: string }
 *                     type: { type: string, enum: [scale, text, boolean] }
 *                     weight: { type: number }
 *     responses:
 *       201: { description: Template created }
 *
 * /mental/templates/{id}:
 *   get:
 *     tags: [Mental Health]
 *     summary: Get template by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Template details }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Mental Health]
 *     summary: Update a template
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
 *               titleAr: { type: string }
 *               isActive: { type: boolean }
 *               questions: { type: array, items: { type: object } }
 *     responses:
 *       200: { description: Template updated }
 *   delete:
 *     tags: [Mental Health]
 *     summary: Delete a template
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Template deleted }
 *
 * /mental/assessments:
 *   get:
 *     tags: [Mental Health]
 *     summary: List assessments (scoped by role — MentalCoach sees only assigned players)
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
 *     responses:
 *       200: { description: Paginated list of assessments }
 *   post:
 *     tags: [Mental Health]
 *     summary: Create an assessment for a player
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, templateId, responses]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               templateId: { type: string, format: uuid }
 *               sessionDate: { type: string, format: date }
 *               responses: { type: array, items: { type: object } }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Assessment created }
 *
 * /mental/assessments/alerts:
 *   get:
 *     tags: [Mental Health]
 *     summary: Get players with low mental wellness scores requiring attention
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of alert entries with player and score }
 *
 * /mental/assessments/player/{playerId}/trend:
 *   get:
 *     tags: [Mental Health]
 *     summary: Get assessment trend for a player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Number of recent assessments to include
 *     responses:
 *       200: { description: Trend data with scores over time }
 *
 * /mental/assessments/{id}:
 *   get:
 *     tags: [Mental Health]
 *     summary: Get assessment by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Assessment details }
 *       403: { description: Access denied — not the assigned coach }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Mental Health]
 *     summary: Update an assessment
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
 *               responses: { type: array, items: { type: object } }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Assessment updated }
 *   delete:
 *     tags: [Mental Health]
 *     summary: Delete an assessment
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Assessment deleted }
 */
