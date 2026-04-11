/**
 * @swagger
 * tags:
 *   - name: Press Releases
 *     description: Bilingual press release authoring and publishing workflow
 *
 * /media/press-releases:
 *   get:
 *     tags: [Press Releases]
 *     summary: List press releases
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
 *         schema: { type: string, enum: [created_at, updated_at, published_at, title, status], default: created_at }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, review, approved, published, archived] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [transfer, injury, achievement, announcement, general] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of press releases }
 *   post:
 *     tags: [Press Releases]
 *     summary: Create a press release
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, maxLength: 500 }
 *               titleAr: { type: string }
 *               category: { type: string, enum: [transfer, injury, achievement, announcement, general], default: general }
 *               contentEn: { type: string }
 *               contentAr: { type: string }
 *               excerptEn: { type: string, maxLength: 1000 }
 *               excerptAr: { type: string, maxLength: 1000 }
 *               coverImageUrl: { type: string, format: uri, maxLength: 500 }
 *               playerId: { type: string, format: uuid }
 *               clubId: { type: string, format: uuid }
 *               matchId: { type: string, format: uuid }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Press release created }
 *
 * /media/press-releases/{id}:
 *   get:
 *     tags: [Press Releases]
 *     summary: Get a press release by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Press release details }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Press Releases]
 *     summary: Update a press release
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
 *               category: { type: string, enum: [transfer, injury, achievement, announcement, general] }
 *               contentEn: { type: string }
 *               contentAr: { type: string }
 *               excerptEn: { type: string }
 *               excerptAr: { type: string }
 *               coverImageUrl: { type: string, format: uri }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Press release updated }
 *   delete:
 *     tags: [Press Releases]
 *     summary: Delete a press release
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Press release deleted }
 *
 * /media/press-releases/{id}/status:
 *   patch:
 *     tags: [Press Releases]
 *     summary: Update press release status (workflow transition)
 *     description: |
 *       Valid transitions:
 *       - draft -> review
 *       - review -> approved | draft
 *       - approved -> published | draft
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
 *               status: { type: string, enum: [draft, review, approved, published, archived] }
 *     responses:
 *       200: { description: Status updated }
 *
 * /media/press-releases/slug/{slug}:
 *   get:
 *     tags: [Press Releases]
 *     summary: Get a press release by slug
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Press release details }
 *       404: { description: Not found }
 */
