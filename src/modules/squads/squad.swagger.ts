/**
 * @swagger
 * components:
 *   schemas:
 *     Squad:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         clubId: { type: string, format: uuid }
 *         ageCategory:
 *           type: string
 *           enum: [senior, u23, u21, u20, u19, u17, u15, u13]
 *         division:
 *           type: string
 *           nullable: true
 *           example: 1st-division
 *         displayName: { type: string, example: 'Al Hilal U-17 1st Division' }
 *         displayNameAr: { type: string, example: 'الهلال تحت 17 الدرجة الأولى' }
 *         isActive: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 * /squads:
 *   get:
 *     tags: [Squads]
 *     summary: List squads (paginated, filterable)
 *     security:
 *       - bearerAuth: []
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
 *         description: Search by display name (Arabic or English)
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: ageCategory
 *         schema:
 *           type: string
 *           enum: [senior, u23, u21, u20, u19, u17, u15, u13]
 *       - in: query
 *         name: division
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of squads
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Squad'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *
 * /squads/{id}:
 *   get:
 *     tags: [Squads]
 *     summary: Get a single squad by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Squad found }
 *       404: { description: Squad not found }
 *
 * /squads/by-club/{clubId}:
 *   get:
 *     tags: [Squads]
 *     summary: List every squad under a parent club
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clubId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: All squads belonging to the club, ordered by age then division
 */
export {};
