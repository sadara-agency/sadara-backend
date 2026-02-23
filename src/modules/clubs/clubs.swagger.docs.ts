/**
 * @swagger
 * /clubs:
 *   get:
 *     tags: [Clubs]
 *     summary: List all clubs (with pagination & filters)
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
 *         description: Search by name (Arabic or English)
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [Club, Sponsor] }
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: name }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: asc }
 *     responses:
 *       200:
 *         description: Paginated list of clubs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Club'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *   post:
 *     tags: [Clubs]
 *     summary: Create a new club (Admin/Manager)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: 'Al-Hilal FC' }
 *               nameAr: { type: string, example: 'نادي الهلال' }
 *               type: { type: string, enum: [Club, Sponsor], default: Club }
 *               country: { type: string, example: 'Saudi Arabia' }
 *               city: { type: string, example: 'Riyadh' }
 *               league: { type: string, example: 'Saudi Pro League' }
 *               logoUrl: { type: string, format: uri }
 *               website: { type: string }
 *               foundedYear: { type: integer, example: 1957 }
 *               stadium: { type: string, example: 'King Fahd Stadium' }
 *               stadiumCapacity: { type: integer, example: 68000 }
 *               primaryColor: { type: string, example: '#1C3F94' }
 *               secondaryColor: { type: string, example: '#FFFFFF' }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Club created }
 *
 * /clubs/{id}:
 *   get:
 *     tags: [Clubs]
 *     summary: Get club by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Club details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/Club'
 *       404: { description: Club not found }
 *   patch:
 *     tags: [Clubs]
 *     summary: Update club (Admin/Manager)
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
 *               type: { type: string, enum: [Club, Sponsor] }
 *               country: { type: string }
 *               city: { type: string }
 *               league: { type: string }
 *               logoUrl: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Club updated }
 *   delete:
 *     tags: [Clubs]
 *     summary: Delete club (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Club deleted }
 */