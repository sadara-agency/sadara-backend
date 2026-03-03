import { Response, NextFunction } from "express";
import { AuthRequest, UserRole } from "../shared/types";

/**
 * Field-level access control middleware.
 *
 * Strips specified fields from the response JSON based on the
 * authenticated user's role. Applies to `res.json()` calls only.
 *
 * Usage:
 *   router.get('/players', fieldAccess(PLAYER_HIDDEN_FIELDS), asyncHandler(ctrl.list));
 *
 * Config format:
 *   { fieldName: [roles that CANNOT see it] }
 */

type HiddenFieldsConfig = Record<string, UserRole[]>;

export function fieldAccess(config: HiddenFieldsConfig) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role) {
      next();
      return;
    }

    // Collect fields to strip for this role
    const fieldsToStrip = Object.entries(config)
      .filter(([, deniedRoles]) => deniedRoles.includes(role))
      .map(([field]) => field);

    if (fieldsToStrip.length === 0) {
      next();
      return;
    }

    // Intercept res.json to strip fields before sending
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (body && typeof body === "object") {
        stripFields(body, fieldsToStrip);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Recursively strip fields from the response payload.
 * Handles { data: {...} }, { data: [...] }, and nested structures.
 */
function stripFields(obj: any, fields: string[]): void {
  if (!obj || typeof obj !== "object") return;

  // If it has a `data` wrapper (our standard API response), process inside
  if (obj.data) {
    if (Array.isArray(obj.data)) {
      for (const item of obj.data) {
        removeKeys(item, fields);
      }
    } else if (typeof obj.data === "object") {
      removeKeys(obj.data, fields);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      removeKeys(item, fields);
    }
  } else {
    removeKeys(obj, fields);
  }
}

function removeKeys(obj: any, fields: string[]): void {
  if (!obj || typeof obj !== "object") return;
  for (const field of fields) {
    if (field in obj) {
      obj[field] = "[REDACTED]";
    }
  }
}

// ── Pre-built configs for common entities ──

/** Fields hidden from Scout and Player roles on player endpoints */
export const PLAYER_HIDDEN_FIELDS: HiddenFieldsConfig = {
  phone: ["Scout", "Player"],
  email: ["Scout", "Player"],
  guardianPhone: ["Scout", "Player"],
  guardianName: ["Scout", "Player"],
};

/** Fields hidden from non-Admin/Manager on contract endpoints */
export const CONTRACT_HIDDEN_FIELDS: HiddenFieldsConfig = {
  baseSalary: ["Scout", "Player", "Analyst"],
  commissionPct: ["Scout", "Player", "Analyst"],
  totalCommission: ["Scout", "Player", "Analyst"],
  signingBonus: ["Scout", "Player", "Analyst"],
  releaseClause: ["Scout", "Player"],
};

/** Fields hidden from non-Admin on finance endpoints */
export const FINANCE_HIDDEN_FIELDS: HiddenFieldsConfig = {
  amount: ["Scout", "Player"],
  taxAmount: ["Scout", "Player"],
  totalAmount: ["Scout", "Player"],
};
