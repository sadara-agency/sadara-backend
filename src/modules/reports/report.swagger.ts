/**
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Predefined reports, custom reports, and exports (XLSX/PDF)
 *
 * /reports/player-portfolio:
 *   get:
 *     tags: [Reports]
 *     summary: Player portfolio report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Player portfolio data }
 *
 * /reports/contract-commission:
 *   get:
 *     tags: [Reports]
 *     summary: Contract commission report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Commission data }
 *
 * /reports/injury-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Injury summary report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Injury summary }
 *
 * /reports/match-tasks:
 *   get:
 *     tags: [Reports]
 *     summary: Match tasks report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Match tasks data }
 *
 * /reports/financial-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Financial summary report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Financial summary }
 *
 * /reports/scouting-pipeline:
 *   get:
 *     tags: [Reports]
 *     summary: Scouting pipeline report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pipeline data }
 *
 * /reports/expiring-contracts:
 *   get:
 *     tags: [Reports]
 *     summary: Expiring contracts report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Expiring contracts list }
 *
 * /reports/{type}/xlsx:
 *   get:
 *     tags: [Reports]
 *     summary: Export report as XLSX
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, example: player-portfolio }
 *     responses:
 *       200:
 *         description: XLSX file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema: { type: string, format: binary }
 *
 * /reports/{type}/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Export report as PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, example: player-portfolio }
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *
 * /reports:
 *   get:
 *     tags: [Reports]
 *     summary: List saved reports
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated list of reports }
 *   post:
 *     tags: [Reports]
 *     summary: Create a custom report
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type]
 *             properties:
 *               title: { type: string }
 *               type: { type: string }
 *               filters: { type: object }
 *     responses:
 *       201: { description: Report created }
 *
 * /reports/{id}:
 *   get:
 *     tags: [Reports]
 *     summary: Get report by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Report details }
 *   delete:
 *     tags: [Reports]
 *     summary: Delete report (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Report deleted }
 *
 * /reports/{id}/download:
 *   get:
 *     tags: [Reports]
 *     summary: Download report file
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: File download }
 */
