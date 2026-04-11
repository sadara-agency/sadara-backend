/**
 * @swagger
 * tags:
 *   - name: Media Requests
 *     description: Journalist interview and press conference requests
 *
 * /media/requests:
 *   get:
 *     tags: [Media Requests]
 *     summary: List media requests (with filters)
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
 *         schema: { type: string, enum: [created_at, updated_at, deadline, status, priority], default: created_at }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, scheduled, completed, declined] }
 *       - in: query
 *         name: requestType
 *         schema: { type: string, enum: [interview, press_conference, photo_shoot, statement, other] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, normal, high, urgent] }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of media requests }
 *   post:
 *     tags: [Media Requests]
 *     summary: Create a media request
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [journalistName, outlet, subject]
 *             properties:
 *               journalistName: { type: string, maxLength: 255 }
 *               journalistNameAr: { type: string, maxLength: 255 }
 *               outlet: { type: string, maxLength: 255 }
 *               outletAr: { type: string }
 *               journalistEmail: { type: string, format: email }
 *               journalistPhone: { type: string, maxLength: 100 }
 *               requestType: { type: string, enum: [interview, press_conference, photo_shoot, statement, other], default: interview }
 *               subject: { type: string, maxLength: 500 }
 *               subjectAr: { type: string }
 *               description: { type: string, maxLength: 2000 }
 *               descriptionAr: { type: string, maxLength: 2000 }
 *               playerId: { type: string, format: uuid }
 *               clubId: { type: string, format: uuid }
 *               matchId: { type: string, format: uuid }
 *               priority: { type: string, enum: [low, normal, high, urgent], default: normal }
 *               deadline: { type: string, format: date-time }
 *               scheduledAt: { type: string, format: date-time }
 *               notes: { type: string, maxLength: 2000 }
 *               assignedTo: { type: string, format: uuid }
 *     responses:
 *       201: { description: Media request created }
 *
 * /media/requests/{id}:
 *   get:
 *     tags: [Media Requests]
 *     summary: Get a media request by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Media request details }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Media Requests]
 *     summary: Update a media request
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
 *               journalistName: { type: string }
 *               outlet: { type: string }
 *               subject: { type: string }
 *               priority: { type: string, enum: [low, normal, high, urgent] }
 *               deadline: { type: string, format: date-time }
 *               scheduledAt: { type: string, format: date-time }
 *               assignedTo: { type: string, format: uuid }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Media request updated }
 *   delete:
 *     tags: [Media Requests]
 *     summary: Delete a media request
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Media request deleted }
 *
 * /media/requests/{id}/status:
 *   patch:
 *     tags: [Media Requests]
 *     summary: Update media request status
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
 *               status: { type: string, enum: [pending, approved, scheduled, completed, declined] }
 *               declineReason: { type: string }
 *               scheduledAt: { type: string, format: date-time }
 *     responses:
 *       200: { description: Status updated }
 */
