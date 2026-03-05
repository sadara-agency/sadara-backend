/**
 * @swagger
 * tags:
 *   - name: Players
 *     description: Player CRUD, photo upload, stats, and provider mappings
 *
 * /players:
 *   get:
 *     tags: [Players]
 *     summary: List players with pagination & filters
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
 *         description: Search by name (EN/AR)
 *       - in: query
 *         name: position
 *         schema: { type: string }
 *       - in: query
 *         name: nationality
 *         schema: { type: string }
 *       - in: query
 *         name: playerType
 *         schema: { type: string, enum: [Pro, Youth] }
 *       - in: query
 *         name: currentClubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: firstName }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Paginated player list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Player' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Players]
 *     summary: Create a new player (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, dateOfBirth]
 *             properties:
 *               firstName: { type: string, example: 'Salem' }
 *               lastName: { type: string, example: 'Al-Dawsari' }
 *               firstNameAr: { type: string, example: 'سالم' }
 *               lastNameAr: { type: string, example: 'الدوسري' }
 *               dateOfBirth: { type: string, format: date, example: '1991-08-19' }
 *               nationality: { type: string, example: 'Saudi Arabia' }
 *               secondaryNationality: { type: string }
 *               playerType: { type: string, enum: [Pro, Youth], default: Pro }
 *               position: { type: string, example: 'LW' }
 *               secondaryPosition: { type: string }
 *               preferredFoot: { type: string, enum: [Left, Right, Both] }
 *               heightCm: { type: number, example: 171 }
 *               weightKg: { type: number, example: 66 }
 *               jerseyNumber: { type: integer, minimum: 1, maximum: 99 }
 *               currentClubId: { type: string, format: uuid }
 *               marketValue: { type: number }
 *               marketValueCurrency: { type: string, enum: [SAR, USD, EUR], default: SAR }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               notes: { type: string }
 *               speed: { type: integer, minimum: 0, maximum: 100 }
 *               passing: { type: integer, minimum: 0, maximum: 100 }
 *               shooting: { type: integer, minimum: 0, maximum: 100 }
 *               defense: { type: integer, minimum: 0, maximum: 100 }
 *               fitness: { type: integer, minimum: 0, maximum: 100 }
 *               tactical: { type: integer, minimum: 0, maximum: 100 }
 *     responses:
 *       201: { description: Player created }
 *       403: { description: Admin or Manager role required }
 *       422: { description: Validation error }
 *
 * /players/check-duplicate:
 *   get:
 *     tags: [Players]
 *     summary: Check for duplicate players
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: firstName
 *         schema: { type: string }
 *       - in: query
 *         name: lastName
 *         schema: { type: string }
 *       - in: query
 *         name: dateOfBirth
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Duplicate check result
 *
 * /players/{id}:
 *   get:
 *     tags: [Players]
 *     summary: Get player by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Player details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Player' }
 *       404: { description: Player not found }
 *   patch:
 *     tags: [Players]
 *     summary: Update player (Admin/Manager)
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
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               position: { type: string }
 *               nationality: { type: string }
 *               marketValue: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Player updated }
 *   delete:
 *     tags: [Players]
 *     summary: Delete player (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Player deleted }
 *       403: { description: Admin role required }
 *
 * /players/{id}/photo:
 *   post:
 *     tags: [Players]
 *     summary: Upload player photo (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Photo uploaded }
 *
 * /players/{id}/club-history:
 *   get:
 *     tags: [Players]
 *     summary: Get player club history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: List of clubs the player has been associated with }
 *
 * /players/{id}/providers:
 *   get:
 *     tags: [Players]
 *     summary: Get external provider mappings (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Provider mappings for the player }
 *   put:
 *     tags: [Players]
 *     summary: Upsert external provider mapping (Admin/Manager)
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
 *             required: [provider, externalId]
 *             properties:
 *               provider: { type: string, example: 'wyscout' }
 *               externalId: { type: string, example: '123456' }
 *     responses:
 *       200: { description: Provider mapping saved }
 *
 * /players/{id}/providers/{provider}:
 *   delete:
 *     tags: [Players]
 *     summary: Remove external provider mapping (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Provider mapping removed }
 *
 * /players/{id}/refresh-stats:
 *   post:
 *     tags: [Players]
 *     summary: Refresh player stats from external provider (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Stats refreshed from external provider }
 */
