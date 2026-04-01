import { Router, Response } from "express";
import { asyncHandler } from "@middleware/errorHandler";
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
} from "@modules/permissions/permission.service";
import { RoleFieldPermission } from "@modules/permissions/fieldPermission.model";
import { CONFIGURABLE_FIELDS } from "@modules/permissions/fieldPermission.config";
import {
  updatePermissionsSchema,
  updateFieldPermissionsSchema,
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
    const LOCKED_ROLES = ["Admin", "Player"];
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

router.get(
  "/fields/config",
  authorize("Admin"),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    sendSuccess(res, CONFIGURABLE_FIELDS);
  }),
);

// ── GET /permissions/fields — field-level permissions map (own-role for non-Admin) ──

router.get(
  "/fields",
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const perms = await getFieldPermissions();
    if (req.user?.role === "Admin") {
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
    const LOCKED_ROLES = ["Admin", "Player"];
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
