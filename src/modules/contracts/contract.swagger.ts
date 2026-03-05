/**
 * @swagger
 * tags:
 *   - name: Contracts
 *     description: Contract CRUD, status transitions, PDF generation, and termination
 *
 * /contracts:
 *   get:
 *     tags: [Contracts]
 *     summary: List contracts with pagination & filters
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
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Club, Sponsorship] }
 *       - in: query
 *         name: contractType
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated contract list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Contract' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Contracts]
 *     summary: Create a new contract (Admin/Manager/Legal)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, clubId, startDate, endDate]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               clubId: { type: string, format: uuid }
 *               category: { type: string, enum: [Club, Sponsorship], default: Club }
 *               contractType:
 *                 type: string
 *                 enum: [Representation, CareerManagement, Transfer, Loan, Renewal, Sponsorship, ImageRights, MedicalAuth]
 *                 default: Representation
 *               title: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               baseSalary: { type: number }
 *               salaryCurrency: { type: string, enum: [SAR, USD, EUR], default: SAR }
 *               signingBonus: { type: number, default: 0 }
 *               releaseClause: { type: number }
 *               performanceBonus: { type: number, default: 0 }
 *               commissionPct: { type: number, minimum: 0, maximum: 100 }
 *               exclusivity: { type: string, enum: [Exclusive, NonExclusive], default: Exclusive }
 *               representationScope: { type: string, enum: [Local, International, Both], default: Both }
 *               agentName: { type: string }
 *               agentLicense: { type: string }
 *               playerContractType: { type: string, enum: [Professional, Amateur, Youth] }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Contract created }
 *       422: { description: Validation error }
 *
 * /contracts/{id}:
 *   get:
 *     tags: [Contracts]
 *     summary: Get contract by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Contract details with player and club info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Contract' }
 *       404: { description: Contract not found }
 *   patch:
 *     tags: [Contracts]
 *     summary: Update contract (Admin/Manager/Legal)
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
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               baseSalary: { type: number }
 *               releaseClause: { type: number }
 *               commissionPct: { type: number }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Contract updated }
 *   delete:
 *     tags: [Contracts]
 *     summary: Delete contract (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Contract deleted }
 *
 * /contracts/{id}/pdf:
 *   get:
 *     tags: [Contracts]
 *     summary: Generate contract PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: PDF file stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404: { description: Contract not found }
 *
 * /contracts/{id}/transition:
 *   post:
 *     tags: [Contracts]
 *     summary: Transition contract status (Admin/Manager/Legal)
 *     description: "Allowed actions: submit_review, approve, reject_to_draft, agent_sign_digital, agent_sign_upload, return_review"
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [submit_review, approve, reject_to_draft, agent_sign_digital, agent_sign_upload, return_review]
 *               signatureData: { type: string }
 *               signedDocumentUrl: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Contract status transitioned }
 *       400: { description: Invalid transition }
 *
 * /contracts/{id}/terminate:
 *   post:
 *     tags: [Contracts]
 *     summary: Terminate a contract (Admin/Manager/Legal)
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, maxLength: 1000 }
 *               terminationDate: { type: string, format: date }
 *               clearanceId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Contract terminated }
 */
