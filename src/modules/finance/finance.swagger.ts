/**
 * @swagger
 * tags:
 *   - name: Finance
 *     description: Invoices, payments, ledger entries, valuations, and financial dashboards
 *
 * /finance/summary:
 *   get:
 *     tags: [Finance]
 *     summary: Get financial summary (totals & KPIs)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Financial summary with revenue, outstanding, etc. }
 *
 * /finance/dashboard:
 *   get:
 *     tags: [Finance]
 *     summary: Get finance dashboard data
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard with charts and recent activity }
 *
 * /finance/invoices:
 *   get:
 *     tags: [Finance]
 *     summary: List invoices with pagination & filters
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
 *         name: status
 *         schema: { type: string, enum: [Paid, Expected, Overdue, Cancelled] }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: clubId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: contractId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: dueDate }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated invoice list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Invoice' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Finance]
 *     summary: Create an invoice (Admin/Manager/Finance)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, totalAmount, dueDate]
 *             properties:
 *               contractId: { type: string, format: uuid }
 *               playerId: { type: string, format: uuid }
 *               clubId: { type: string, format: uuid }
 *               amount: { type: number, minimum: 0 }
 *               taxAmount: { type: number, default: 0 }
 *               totalAmount: { type: number, minimum: 0 }
 *               currency: { type: string, default: SAR, maxLength: 3 }
 *               dueDate: { type: string, format: date }
 *               issueDate: { type: string, format: date }
 *               description: { type: string }
 *               lineItems:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       201: { description: Invoice created }
 *
 * /finance/invoices/{id}:
 *   get:
 *     tags: [Finance]
 *     summary: Get invoice by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invoice details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Invoice' }
 *       404: { description: Invoice not found }
 *   patch:
 *     tags: [Finance]
 *     summary: Update invoice (Admin/Manager/Finance)
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
 *               amount: { type: number }
 *               taxAmount: { type: number }
 *               totalAmount: { type: number }
 *               dueDate: { type: string, format: date }
 *               description: { type: string }
 *               lineItems: { type: array, items: { type: object } }
 *               documentUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: Invoice updated }
 *   delete:
 *     tags: [Finance]
 *     summary: Delete invoice (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Invoice deleted }
 *
 * /finance/invoices/{id}/status:
 *   patch:
 *     tags: [Finance]
 *     summary: Update invoice status (Admin/Manager/Finance)
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
 *               status: { type: string, enum: [Paid, Expected, Overdue, Cancelled] }
 *               paidDate: { type: string, format: date }
 *     responses:
 *       200: { description: Invoice status updated }
 *
 * /finance/payments:
 *   get:
 *     tags: [Finance]
 *     summary: List payments with pagination & filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Paid, Expected, Overdue, Cancelled] }
 *       - in: query
 *         name: paymentType
 *         schema: { type: string, enum: [Commission, Sponsorship, Bonus] }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated payment list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Payment' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Finance]
 *     summary: Create a payment (Admin/Manager/Finance)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, dueDate]
 *             properties:
 *               invoiceId: { type: string, format: uuid }
 *               milestoneId: { type: string, format: uuid }
 *               playerId: { type: string, format: uuid }
 *               amount: { type: number, minimum: 0 }
 *               currency: { type: string, default: SAR }
 *               paymentType: { type: string, enum: [Commission, Sponsorship, Bonus], default: Commission }
 *               dueDate: { type: string, format: date }
 *               reference: { type: string }
 *               payer: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Payment created }
 *
 * /finance/payments/{id}/status:
 *   patch:
 *     tags: [Finance]
 *     summary: Update payment status (Admin/Manager/Finance)
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
 *               status: { type: string, enum: [Paid, Expected, Overdue, Cancelled] }
 *               paidDate: { type: string, format: date }
 *               reference: { type: string }
 *     responses:
 *       200: { description: Payment status updated }
 *
 * /finance/ledger:
 *   get:
 *     tags: [Finance]
 *     summary: List ledger entries
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: side
 *         schema: { type: string, enum: [Debit, Credit] }
 *       - in: query
 *         name: account
 *         schema: { type: string }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Paginated ledger entries }
 *   post:
 *     tags: [Finance]
 *     summary: Create a ledger entry (Admin/Finance)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [side, account, amount]
 *             properties:
 *               transactionId: { type: string, format: uuid }
 *               side: { type: string, enum: [Debit, Credit] }
 *               account: { type: string, maxLength: 255 }
 *               amount: { type: number, minimum: 0 }
 *               currency: { type: string, default: SAR }
 *               description: { type: string }
 *               referenceType: { type: string }
 *               referenceId: { type: string, format: uuid }
 *               playerId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Ledger entry created }
 *
 * /finance/valuations:
 *   get:
 *     tags: [Finance]
 *     summary: List player valuations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: trend
 *         schema: { type: string, enum: [up, down, stable] }
 *     responses:
 *       200: { description: Paginated valuations }
 *   post:
 *     tags: [Finance]
 *     summary: Record a player valuation (Admin/Manager/Analyst/Finance)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId, value]
 *             properties:
 *               playerId: { type: string, format: uuid }
 *               value: { type: number, minimum: 0 }
 *               currency: { type: string, default: SAR }
 *               source: { type: string, example: 'Transfermarkt' }
 *               trend: { type: string, enum: [up, down, stable], default: stable }
 *               changePct: { type: number }
 *               valuedAt: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Valuation recorded }
 */
