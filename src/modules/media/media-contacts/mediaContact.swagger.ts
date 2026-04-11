/**
 * @swagger
 * tags:
 *   - name: Media Contacts
 *     description: Journalist and media outlet contact directory
 *
 * /media/contacts:
 *   get:
 *     tags: [Media Contacts]
 *     summary: List media contacts
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
 *         schema: { type: string, enum: [created_at, updated_at, name, outlet], default: created_at }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: outlet
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated list of media contacts }
 *   post:
 *     tags: [Media Contacts]
 *     summary: Create a media contact
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, outlet]
 *             properties:
 *               name: { type: string, maxLength: 255 }
 *               nameAr: { type: string }
 *               outlet: { type: string, maxLength: 255 }
 *               outletAr: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string, maxLength: 100 }
 *               role: { type: string, maxLength: 100 }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Media contact created }
 *
 * /media/contacts/{id}:
 *   get:
 *     tags: [Media Contacts]
 *     summary: Get a media contact by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Media contact details }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Media Contacts]
 *     summary: Update a media contact
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
 *               outlet: { type: string }
 *               outletAr: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               role: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Media contact updated }
 *   delete:
 *     tags: [Media Contacts]
 *     summary: Delete a media contact
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Media contact deleted }
 */
