/**
 * @swagger
 * tags:
 *   - name: Calendar
 *     description: Calendar event management
 *
 * /calendar:
 *   get:
 *     tags: [Calendar]
 *     summary: List calendar events (with filters & pagination)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [Match, Training, Medical, Meeting, Other] }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: timezone
 *         schema: { type: string, example: 'Asia/Riyadh' }
 *     responses:
 *       200:
 *         description: Paginated list of calendar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Calendar]
 *     summary: Create a calendar event
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startAt, endAt]
 *             properties:
 *               title: { type: string, example: 'Pre-match training' }
 *               titleAr: { type: string }
 *               description: { type: string }
 *               type: { type: string, enum: [Match, Training, Medical, Meeting, Other] }
 *               startAt: { type: string, format: date-time }
 *               endAt: { type: string, format: date-time }
 *               timezone: { type: string, example: 'Asia/Riyadh', default: 'Asia/Riyadh' }
 *               isRecurring: { type: boolean, default: false }
 *               rrule: { type: string, description: 'iCal RRULE string for recurring events' }
 *               sourceType: { type: string, example: 'Match' }
 *               sourceId: { type: string, format: uuid }
 *               playerIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *     responses:
 *       201: { description: Event created }
 *
 * /calendar/{id}:
 *   get:
 *     tags: [Calendar]
 *     summary: Get calendar event by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Event details }
 *       404: { description: Event not found }
 *   patch:
 *     tags: [Calendar]
 *     summary: Update a calendar event
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
 *               description: { type: string }
 *               type: { type: string, enum: [Match, Training, Medical, Meeting, Other] }
 *               startAt: { type: string, format: date-time }
 *               endAt: { type: string, format: date-time }
 *               timezone: { type: string }
 *               isRecurring: { type: boolean }
 *               rrule: { type: string }
 *     responses:
 *       200: { description: Event updated }
 *   delete:
 *     tags: [Calendar]
 *     summary: Delete a calendar event
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Event deleted }
 *
 * /calendar/source/{sourceType}/{sourceId}:
 *   get:
 *     tags: [Calendar]
 *     summary: Get calendar event by linked source entity
 *     description: Returns the calendar event linked to a specific source (e.g. Match, Training session)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sourceType
 *         required: true
 *         schema: { type: string, example: 'Match' }
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Event details for the source entity }
 *       404: { description: No event found for this source }
 */
