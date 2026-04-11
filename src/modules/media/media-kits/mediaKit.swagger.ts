/**
 * @swagger
 * tags:
 *   - name: Media Kits
 *     description: Generate and download player profile and squad roster PDFs
 *
 * /media/kits/player/{playerId}:
 *   post:
 *     tags: [Media Kits]
 *     summary: Generate a player profile media kit PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
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
 *               language: { type: string, enum: [en, ar, both], default: both }
 *     responses:
 *       201:
 *         description: Media kit generated with PDF file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     templateType: { type: string, example: player_profile }
 *                     language: { type: string }
 *                     playerId: { type: string, format: uuid }
 *                     fileUrl: { type: string }
 *                     fileSize: { type: integer }
 *
 * /media/kits/squad/{clubId}:
 *   post:
 *     tags: [Media Kits]
 *     summary: Generate a squad roster media kit PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language: { type: string, enum: [en, ar, both], default: both }
 *     responses:
 *       201: { description: Squad roster kit generated with PDF }
 *
 * /media/kits/history:
 *   get:
 *     tags: [Media Kits]
 *     summary: List media kit generation history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: templateType
 *         schema: { type: string, enum: [player_profile, squad_roster] }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Paginated generation history }
 *
 * /media/kits/{id}:
 *   get:
 *     tags: [Media Kits]
 *     summary: Get a media kit generation record by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Media kit generation details }
 *       404: { description: Not found }
 *
 * /media/kits/{id}/download:
 *   get:
 *     tags: [Media Kits]
 *     summary: Get a download URL for a generated media kit PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Signed download URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl: { type: string, format: uri }
 *       404: { description: PDF not yet generated }
 */
