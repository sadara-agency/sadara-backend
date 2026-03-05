/**
 * @swagger
 * tags:
 *   - name: Injuries
 *     description: Injury tracking, updates, and player injury history
 *
 * /injuries:
 *   get:
 *     tags: [Injuries]
 *     summary: List injuries with pagination & filters
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
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [Minor, Moderate, Severe, Critical] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [UnderTreatment, Recovered, Relapsed, Chronic] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: injuryDate }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated injury list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Injury' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Injuries]
 *     summary: Record a new injury
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, injuryType, bodyPart, injuryDate]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               matchId: { type: string, format: uuid }
 *               injuryType: { type: string, example: 'ACL Tear' }
 *               injuryTypeAr: { type: string }
 *               bodyPart: { type: string, example: 'Knee' }
 *               bodyPartAr: { type: string }
 *               severity: { type: string, enum: [Minor, Moderate, Severe, Critical], default: Moderate }
 *               cause: { type: string, enum: [Training, Match, NonFootball, Unknown], default: Unknown }
 *               injuryDate: { type: string, format: date }
 *               expectedReturnDate: { type: string, format: date }
 *               diagnosis: { type: string }
 *               diagnosisAr: { type: string }
 *               treatmentPlan: { type: string }
 *               treatmentPlanAr: { type: string }
 *               medicalProvider: { type: string }
 *               surgeonName: { type: string }
 *               estimatedDaysOut: { type: integer, minimum: 0 }
 *               isSurgeryRequired: { type: boolean, default: false }
 *               surgeryDate: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Injury recorded }
 *       422: { description: Validation error }
 *
 * /injuries/stats:
 *   get:
 *     tags: [Injuries]
 *     summary: Get injury dashboard statistics
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Injury stats (active count, severity breakdown, etc.) }
 *
 * /injuries/player/{playerId}:
 *   get:
 *     tags: [Injuries]
 *     summary: Get injuries for a specific player
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Player injury history }
 *
 * /injuries/{id}:
 *   get:
 *     tags: [Injuries]
 *     summary: Get injury by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Injury details with updates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Injury' }
 *       404: { description: Injury not found }
 *   patch:
 *     tags: [Injuries]
 *     summary: Update injury details
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
 *               injuryType: { type: string }
 *               bodyPart: { type: string }
 *               severity: { type: string, enum: [Minor, Moderate, Severe, Critical] }
 *               status: { type: string, enum: [UnderTreatment, Recovered, Relapsed, Chronic] }
 *               expectedReturnDate: { type: string, format: date, nullable: true }
 *               actualReturnDate: { type: string, format: date, nullable: true }
 *               diagnosis: { type: string }
 *               treatmentPlan: { type: string }
 *               estimatedDaysOut: { type: integer, nullable: true }
 *               actualDaysOut: { type: integer, nullable: true }
 *               isSurgeryRequired: { type: boolean }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Injury updated }
 *   delete:
 *     tags: [Injuries]
 *     summary: Delete injury (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Injury deleted }
 *
 * /injuries/{id}/updates:
 *   post:
 *     tags: [Injuries]
 *     summary: Add a progress update to an injury
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
 *             required: [notes]
 *             properties:
 *               status: { type: string, enum: [UnderTreatment, Recovered, Relapsed, Chronic] }
 *               notes: { type: string }
 *               notesAr: { type: string }
 *     responses:
 *       201: { description: Update added }
 */
