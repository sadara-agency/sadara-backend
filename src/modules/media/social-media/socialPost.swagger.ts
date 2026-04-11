/**
 * @swagger
 * tags:
 *   - name: Social Media
 *     description: Social media post drafting, scheduling, and publishing
 *
 * /media/social:
 *   get:
 *     tags: [Social Media]
 *     summary: List social media posts
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [created_at, scheduled_at, published_at], default: created_at }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: postType
 *         schema: { type: string, enum: [match_day, transfer, injury_update, achievement, general, custom] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, scheduled, published, archived] }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of social media posts }
 *   post:
 *     tags: [Social Media]
 *     summary: Create a social media post
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, postType, platforms]
 *             properties:
 *               title: { type: string, maxLength: 500 }
 *               titleAr: { type: string }
 *               contentEn: { type: string }
 *               contentAr: { type: string }
 *               postType: { type: string, enum: [match_day, transfer, injury_update, achievement, general, custom] }
 *               platforms:
 *                 type: array
 *                 minItems: 1
 *                 items: { type: string, enum: [twitter, instagram, linkedin, facebook, tiktok] }
 *               scheduledAt: { type: string, format: date-time }
 *               playerId: { type: string, format: uuid }
 *               clubId: { type: string, format: uuid }
 *               matchId: { type: string, format: uuid }
 *               imageUrls:
 *                 type: array
 *                 items: { type: string, format: uri }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201: { description: Social media post created }
 *
 * /media/social/{id}:
 *   get:
 *     tags: [Social Media]
 *     summary: Get a social media post by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Social media post details }
 *       404: { description: Not found }
 *   put:
 *     tags: [Social Media]
 *     summary: Update a social media post (not allowed for published/archived)
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
 *               contentEn: { type: string }
 *               contentAr: { type: string }
 *               postType: { type: string, enum: [match_day, transfer, injury_update, achievement, general, custom] }
 *               platforms:
 *                 type: array
 *                 items: { type: string, enum: [twitter, instagram, linkedin, facebook, tiktok] }
 *               scheduledAt: { type: string, format: date-time }
 *               imageUrls:
 *                 type: array
 *                 items: { type: string, format: uri }
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Social media post updated }
 *       400: { description: Cannot edit published or archived posts }
 *   delete:
 *     tags: [Social Media]
 *     summary: Delete a social media post (not allowed for published)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Social media post deleted }
 *       400: { description: Cannot delete published posts }
 *
 * /media/social/{id}/status:
 *   patch:
 *     tags: [Social Media]
 *     summary: Update social media post status (workflow transition)
 *     description: |
 *       Valid transitions:
 *       - draft -> scheduled | published
 *       - scheduled -> draft | published
 *       - published -> archived
 *       - archived -> draft
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
 *               status: { type: string, enum: [draft, scheduled, published, archived] }
 *     responses:
 *       200: { description: Status updated }
 */
