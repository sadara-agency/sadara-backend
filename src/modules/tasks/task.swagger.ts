/**
 * @swagger
 * tags:
 *   - name: Tasks
 *     description: Task management and assignment
 *
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List tasks (with filters & pagination)
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
 *         schema: { type: string, enum: [Open, InProgress, Completed, Canceled] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [Low, Medium, High, Urgent] }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: playerId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, assignedTo]
 *             properties:
 *               title: { type: string, example: 'Review contract offer' }
 *               titleAr: { type: string }
 *               description: { type: string }
 *               priority: { type: string, enum: [Low, Medium, High, Urgent], default: Medium }
 *               dueDate: { type: string, format: date }
 *               assignedTo: { type: string, format: uuid }
 *               playerId: { type: string, format: uuid }
 *               matchId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Task created }
 *
 * /tasks/{id}:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task details }
 *       404: { description: Task not found }
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task fields
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
 *               description: { type: string }
 *               priority: { type: string, enum: [Low, Medium, High, Urgent] }
 *               dueDate: { type: string, format: date }
 *               assignedTo: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task updated }
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete task (Admin/Manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task deleted }
 *       403: { description: Admin/Manager role required }
 *
 * /tasks/{id}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task status
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
 *               status: { type: string, enum: [Open, InProgress, Completed, Canceled] }
 *     responses:
 *       200: { description: Status updated }
 */
