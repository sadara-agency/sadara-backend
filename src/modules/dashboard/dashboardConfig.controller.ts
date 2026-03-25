import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess, sendError } from "@shared/utils/apiResponse";
import * as configService from "@modules/dashboard/dashboardConfig.service";

// GET /dashboard/config — returns widget config for the requesting user's role
export async function getConfig(req: AuthRequest, res: Response) {
  const role = req.user!.role;

  // Admin gets full map for all roles
  if (role === "Admin") {
    const all = await configService.getAllConfigs();
    return sendSuccess(res, all);
  }

  // Others get their own role's config
  const config = await configService.getConfigForRole(role);
  sendSuccess(res, config);
}

// PUT /dashboard/config — admin-only, updates widget configs for a given role
export async function updateConfig(req: AuthRequest, res: Response) {
  const { role, widgets } = req.body;

  if (!role || typeof role !== "string") {
    return sendError(res, "role is required", 400);
  }

  if (!Array.isArray(widgets) || widgets.length === 0) {
    return sendError(res, "widgets array is required", 400);
  }

  if (widgets.length > 50) {
    return sendError(res, "Maximum 50 widget entries per role", 400);
  }

  // Validate each entry
  for (const w of widgets) {
    if (!w.widgetKey || typeof w.widgetKey !== "string") {
      return sendError(res, "Each widget must have a widgetKey", 400);
    }
    if (typeof w.position !== "number") {
      return sendError(res, "Each widget must have a numeric position", 400);
    }
  }

  await configService.updateConfigForRole(role, widgets);
  sendSuccess(res, { message: "Dashboard config updated" });
}
