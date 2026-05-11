import { Router, Response } from "express";
import { asyncHandler, AppError } from "@middleware/errorHandler";
import { authenticate, authorize } from "@middleware/auth";
import { validate } from "@middleware/validate";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import { RolePermission } from "@modules/permissions/permission.model";
import {
  getPermissions,
  invalidatePermissionCache,
  loadPermissions,
  getFieldPermissions,
  loadFieldPermissions,
  getConfigurableFields,
  loadConfigurableFields,
} from "@modules/permissions/permission.service";
import { verifyUserRole } from "@shared/utils/verifyRole";
import { RoleFieldPermission } from "@modules/permissions/fieldPermission.model";
import { ConfigurableField } from "@modules/permissions/configurableField.model";
import {
  updatePermissionsSchema,
  updateFieldPermissionsSchema,
  upsertConfigurableFieldSchema,
  deleteConfigurableFieldSchema,
} from "@modules/permissions/permission.validation";
import { permissionMutationLimiter } from "@middleware/rateLimiter";

const router = Router();
router.use(authenticate);

// ── GET /permissions — full matrix (Admin) or own-role only (others) ──

router.get(
  "/",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const perms = await getPermissions();
    if (req.user?.role === "Admin") {
      await verifyUserRole(req.user.id, "Admin");
      sendSuccess(res, perms);
    } else {
      const role = req.user?.role ?? "";
      const ownPerms: Record<string, any> = {};
      if (perms[role]) ownPerms[role] = perms[role];
      sendSuccess(res, ownPerms);
    }
  }),
);

// ── PUT /permissions — bulk update (Admin only) ──

router.put(
  "/",
  authorize("Admin"),
  permissionMutationLimiter,
  validate(updatePermissionsSchema.shape.body),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { permissions } = req.body;

    // Prevent modifying Admin & Player permissions via API
    const LOCKED_ROLES = ["Admin"];
    const filtered = permissions.filter(
      (p: any) => !LOCKED_ROLES.includes(p.role),
    );

    for (const perm of filtered) {
      await RolePermission.upsert({
        role: perm.role,
        module: perm.module,
        canCreate: perm.canCreate,
        canRead: perm.canRead,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
      });
    }

    await invalidatePermissionCache();
    const updated = await loadPermissions();

    await logAudit(
      "UPDATE",
      "role_permissions",
      "bulk",
      buildAuditContext(req.user!, req.ip),
      `Permissions updated for ${filtered.length} role-module combinations`,
    );

    sendSuccess(res, updated, "Permissions updated");
  }),
);

// ── GET /permissions/fields/config — configurable fields definition (Admin only) ──

/**
 * @swagger
 * /permissions/fields/config:
 *   get:
 *     summary: Get the map of fields that can be hidden per role, keyed by module
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: module → array of { field, label }
 */
router.get(
  "/fields/config",
  authorize("Admin"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, await getConfigurableFields());
  }),
);

// ── POST /permissions/fields/config — add/update a configurable field (Admin only) ──

/**
 * @swagger
 * /permissions/fields/config:
 *   post:
 *     summary: Add or update a configurable field (which fields a module exposes for per-role hiding)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated configurable-fields map
 */
router.post(
  "/fields/config",
  authorize("Admin"),
  permissionMutationLimiter,
  validate(upsertConfigurableFieldSchema.shape.body),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { module, field, label, sortOrder } = req.body;

    const existing = await ConfigurableField.findOne({
      where: { module, field },
    });
    if (existing) {
      await existing.update({
        label,
        sortOrder: sortOrder ?? existing.sortOrder,
      });
    } else {
      await ConfigurableField.create({
        module,
        field,
        label,
        sortOrder: sortOrder ?? 0,
      });
    }

    await invalidatePermissionCache();
    const updated = await loadConfigurableFields();

    await logAudit(
      "UPDATE",
      "configurable_fields",
      `${module}.${field}`,
      buildAuditContext(req.user!, req.ip),
      `Configurable field ${module}.${field} ${existing ? "updated" : "added"}`,
    );

    sendSuccess(res, updated, "Configurable field saved");
  }),
);

// ── DELETE /permissions/fields/config/:id — remove a configurable field (Admin only) ──

/**
 * @swagger
 * /permissions/fields/config/{id}:
 *   delete:
 *     summary: Remove a configurable field
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated configurable-fields map
 */
router.delete(
  "/fields/config/:id",
  authorize("Admin"),
  permissionMutationLimiter,
  validate(deleteConfigurableFieldSchema.shape.params, "params"),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const row = await ConfigurableField.findByPk(id);
    if (!row) throw new AppError("Configurable field not found", 404);

    const { module, field } = row;
    await row.destroy();

    await invalidatePermissionCache();
    const updated = await loadConfigurableFields();

    await logAudit(
      "DELETE",
      "configurable_fields",
      `${module}.${field}`,
      buildAuditContext(req.user!, req.ip),
      `Configurable field ${module}.${field} removed`,
    );

    sendSuccess(res, updated, "Configurable field removed");
  }),
);

// ── GET /permissions/fields — field-level permissions map (own-role for non-Admin) ──

router.get(
  "/fields",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const perms = await getFieldPermissions();
    if (req.user?.role === "Admin") {
      await verifyUserRole(req.user.id, "Admin");
      sendSuccess(res, perms);
    } else {
      const role = req.user?.role ?? "";
      const ownPerms: Record<string, any> = {};
      if (perms[role]) ownPerms[role] = perms[role];
      sendSuccess(res, ownPerms);
    }
  }),
);

// ── PUT /permissions/fields — bulk update field permissions (Admin only) ──

router.put(
  "/fields",
  authorize("Admin"),
  permissionMutationLimiter,
  validate(updateFieldPermissionsSchema.shape.body),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fieldPermissions } = req.body;

    // Prevent modifying Admin & Player field permissions via API
    const LOCKED_ROLES = ["Admin"];
    const filtered = fieldPermissions.filter(
      (p: any) => !LOCKED_ROLES.includes(p.role),
    );

    for (const perm of filtered) {
      await RoleFieldPermission.upsert({
        role: perm.role,
        module: perm.module,
        field: perm.field,
        hidden: perm.hidden,
      });
    }

    await invalidatePermissionCache();
    const updated = await loadFieldPermissions();

    await logAudit(
      "UPDATE",
      "role_field_permissions",
      "bulk",
      buildAuditContext(req.user!, req.ip),
      `Field permissions updated for ${filtered.length} role-module-field combinations`,
    );

    sendSuccess(res, updated, "Field permissions updated");
  }),
);

export default router;
