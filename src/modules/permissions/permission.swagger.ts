/**
 * @swagger
 * tags:
 *   - name: Permissions
 *     description: Role-based and field-level permission management
 *
 * /permissions:
 *   get:
 *     tags: [Permissions]
 *     summary: Get role permissions matrix
 *     description: >
 *       Admin users receive the full permissions matrix for all roles.
 *       Non-admin users receive only their own role's permissions.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Permissions matrix
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   description: Map of role → module → {canCreate, canRead, canUpdate, canDelete}
 *                   additionalProperties:
 *                     type: object
 *                     additionalProperties:
 *                       type: object
 *                       properties:
 *                         canCreate: { type: boolean }
 *                         canRead: { type: boolean }
 *                         canUpdate: { type: boolean }
 *                         canDelete: { type: boolean }
 *   put:
 *     tags: [Permissions]
 *     summary: Bulk-update role permissions (Admin only)
 *     description: >
 *       Updates CRUD permissions for role-module combinations.
 *       Admin role permissions cannot be modified via this endpoint.
 *       Changes are cache-invalidated immediately.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, module, canCreate, canRead, canUpdate, canDelete]
 *                   properties:
 *                     role: { type: string, example: 'Manager' }
 *                     module: { type: string, example: 'players' }
 *                     canCreate: { type: boolean }
 *                     canRead: { type: boolean }
 *                     canUpdate: { type: boolean }
 *                     canDelete: { type: boolean }
 *     responses:
 *       200: { description: Permissions updated and cache invalidated }
 *       403: { description: Admin role required }
 *
 * /permissions/fields/config:
 *   get:
 *     tags: [Permissions]
 *     summary: Get configurable field definitions for field-level permissions (Admin only)
 *     description: >
 *       Returns the static list of modules and fields that can have per-role
 *       visibility configured. Used to render the field permissions UI.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Map of module → array of configurable field names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items: { type: string }
 *       403: { description: Admin role required }
 *
 * /permissions/fields:
 *   get:
 *     tags: [Permissions]
 *     summary: Get field-level permissions map
 *     description: >
 *       Admin users receive the full field permissions map.
 *       Non-admin users receive only their own role's field permissions.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Field permissions map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   description: Map of role → module → field → hidden flag
 *                   additionalProperties:
 *                     type: object
 *                     additionalProperties:
 *                       type: object
 *                       additionalProperties: { type: boolean }
 *   put:
 *     tags: [Permissions]
 *     summary: Bulk-update field-level permissions (Admin only)
 *     description: >
 *       Updates field visibility for role-module-field combinations.
 *       Admin role field permissions cannot be modified via this endpoint.
 *       Changes are cache-invalidated immediately.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fieldPermissions]
 *             properties:
 *               fieldPermissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, module, field, hidden]
 *                   properties:
 *                     role: { type: string, example: 'Analyst' }
 *                     module: { type: string, example: 'players' }
 *                     field: { type: string, example: 'salary' }
 *                     hidden: { type: boolean }
 *     responses:
 *       200: { description: Field permissions updated and cache invalidated }
 *       403: { description: Admin role required }
 */
