/**
 * @swagger
 * tags:
 *   - name: Packages
 *     description: Player portal package management (Admin only)
 *
 * /packages/configs:
 *   get:
 *     tags: [Packages]
 *     summary: Get all package tier configurations (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of package configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       403: { description: Admin role required }
 *   put:
 *     tags: [Packages]
 *     summary: Bulk-update package tier configurations (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [configs]
 *             properties:
 *               configs:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [tier, moduleAccess]
 *                   properties:
 *                     tier: { type: string, enum: [Basic, Standard, Pro, Elite] }
 *                     moduleAccess:
 *                       type: object
 *                       description: Map of module name to enabled flag
 *                       additionalProperties: { type: boolean }
 *     responses:
 *       200: { description: Configurations updated }
 *       403: { description: Admin role required }
 *
 * /packages/players:
 *   get:
 *     tags: [Packages]
 *     summary: List all players with their assigned package tier (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of players with package info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       403: { description: Admin role required }
 *
 * /packages/players/{id}:
 *   patch:
 *     tags: [Packages]
 *     summary: Update a player's package tier assignment (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Player ID
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tier]
 *             properties:
 *               tier: { type: string, enum: [Basic, Standard, Pro, Elite] }
 *     responses:
 *       200: { description: Player package updated }
 *       403: { description: Admin role required }
 *       404: { description: Player not found }
 *
 * /packages/modules:
 *   get:
 *     tags: [Packages]
 *     summary: Get all available portal modules and their feature flags (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of available portal modules
 *       403: { description: Admin role required }
 *
 * /packages/tiers:
 *   get:
 *     tags: [Packages]
 *     summary: Get all package tier definitions (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of tier definitions
 *       403: { description: Admin role required }
 *
 * /packages/tiers/{code}:
 *   patch:
 *     tags: [Packages]
 *     summary: Update a package tier definition (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         description: Tier code (e.g. Basic, Pro)
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string }
 *               labelAr: { type: string }
 *               description: { type: string }
 *               moduleAccess:
 *                 type: object
 *                 additionalProperties: { type: boolean }
 *     responses:
 *       200: { description: Tier updated }
 *       403: { description: Admin role required }
 *       404: { description: Tier not found }
 */
