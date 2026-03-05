/**
 * @swagger
 * tags:
 *   - name: Settings
 *     description: User profile, team management, notification preferences, and integrations
 *
 * /settings/profile:
 *   get:
 *     tags: [Settings]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile }
 *   patch:
 *     tags: [Settings]
 *     summary: Update current user profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               fullNameAr: { type: string }
 *               avatarUrl: { type: string, format: uri, nullable: true }
 *     responses:
 *       200: { description: Profile updated }
 *
 * /settings/change-password:
 *   post:
 *     tags: [Settings]
 *     summary: Change password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password changed }
 *       401: { description: Current password incorrect }
 *
 * /settings/notifications:
 *   get:
 *     tags: [Settings]
 *     summary: Get notification preferences
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Notification preferences }
 *   patch:
 *     tags: [Settings]
 *     summary: Update notification preferences
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contracts: { type: boolean }
 *               offers: { type: boolean }
 *               matches: { type: boolean }
 *               tasks: { type: boolean }
 *               injuries: { type: boolean }
 *               email: { type: boolean }
 *     responses:
 *       200: { description: Preferences updated }
 *
 * /settings/team:
 *   get:
 *     tags: [Settings]
 *     summary: List team members (Admin/Manager)
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
 *         name: role
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Paginated team list }
 *
 * /settings/team/{id}:
 *   patch:
 *     tags: [Settings]
 *     summary: Update team member (Admin only)
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
 *               fullName: { type: string }
 *               role: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Team member updated }
 *
 * /settings/task-rules:
 *   get:
 *     tags: [Settings]
 *     summary: Get task automation rules (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Automation rules }
 *   patch:
 *     tags: [Settings]
 *     summary: Update task automation rules (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Rules updated }
 *
 * /settings/integrations/test-connection:
 *   post:
 *     tags: [Settings]
 *     summary: Test integration provider connection (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider]
 *             properties:
 *               provider: { type: string, example: wyscout }
 *               apiKey: { type: string }
 *     responses:
 *       200: { description: Connection test result }
 */
