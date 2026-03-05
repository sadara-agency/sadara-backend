/**
 * @swagger
 * tags:
 *   - name: Gates
 *     description: Player onboarding gates and checklists
 *
 * /gates:
 *   get:
 *     tags: [Gates]
 *     summary: List gates (with filters)
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
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of gates
 *   post:
 *     tags: [Gates]
 *     summary: Create gate (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, name]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               name: { type: string }
 *               nameAr: { type: string }
 *               order: { type: integer }
 *     responses:
 *       201: { description: Gate created }
 *
 * /gates/initialize:
 *   post:
 *     tags: [Gates]
 *     summary: Initialize default gates for a player (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Gates initialized }
 *
 * /gates/player/{playerId}:
 *   get:
 *     tags: [Gates]
 *     summary: Get all gates for a player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Player gates list }
 *
 * /gates/{id}:
 *   get:
 *     tags: [Gates]
 *     summary: Get gate by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Gate details }
 *   patch:
 *     tags: [Gates]
 *     summary: Update gate (Admin/Manager)
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
 *               notes: { type: string }
 *     responses:
 *       200: { description: Gate updated }
 *   delete:
 *     tags: [Gates]
 *     summary: Delete gate (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Gate deleted }
 *
 * /gates/{id}/advance:
 *   patch:
 *     tags: [Gates]
 *     summary: Advance gate status (Admin/Manager)
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
 *               status: { type: string }
 *     responses:
 *       200: { description: Gate advanced }
 *
 * /gates/{gateId}/checklist:
 *   post:
 *     tags: [Gates]
 *     summary: Add checklist item to gate (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: gateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label]
 *             properties:
 *               label: { type: string }
 *               labelAr: { type: string }
 *     responses:
 *       201: { description: Checklist item added }
 *
 * /gates/checklist/{itemId}:
 *   patch:
 *     tags: [Gates]
 *     summary: Toggle checklist item (Admin/Manager/Analyst)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed: { type: boolean }
 *     responses:
 *       200: { description: Item toggled }
 *   delete:
 *     tags: [Gates]
 *     summary: Delete checklist item (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Item deleted }
 */
