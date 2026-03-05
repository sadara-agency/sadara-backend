/**
 * @swagger
 * tags:
 *   - name: Documents
 *     description: Document management and file uploads
 *
 * /documents:
 *   get:
 *     tags: [Documents]
 *     summary: List documents (with filters)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *       - in: query
 *         name: entityId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of documents
 *   post:
 *     tags: [Documents]
 *     summary: Create document via JSON (Admin/Manager/Analyst/Legal)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, entityType, entityId]
 *             properties:
 *               title: { type: string }
 *               titleAr: { type: string }
 *               entityType: { type: string }
 *               entityId: { type: string, format: uuid }
 *               category: { type: string }
 *               url: { type: string, format: uri }
 *     responses:
 *       201: { description: Document created }
 *       403: { description: Insufficient role }
 *
 * /documents/upload:
 *   post:
 *     tags: [Documents]
 *     summary: Upload a file (Admin/Manager/Analyst/Legal)
 *     security: [{ bearerAuth: [] }]
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
 *               title: { type: string }
 *               entityType: { type: string }
 *               entityId: { type: string, format: uuid }
 *               category: { type: string }
 *     responses:
 *       201: { description: File uploaded }
 *       400: { description: File too large or invalid type (max 25MB) }
 *
 * /documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Get document by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Document details }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Documents]
 *     summary: Update document (Admin/Manager/Legal)
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
 *               category: { type: string }
 *     responses:
 *       200: { description: Document updated }
 *   delete:
 *     tags: [Documents]
 *     summary: Delete document (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Document deleted }
 */
