import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as svc from "@modules/contracts/contractTemplate.service";
import {
  createContractTemplateSchema,
  updateContractTemplateSchema,
} from "@modules/contracts/contractTemplate.validation";
import {
  applyMinimalTags,
  renderContractPdf,
} from "@modules/contracts/contractDocument.service";

export async function listTemplates(_req: AuthRequest, res: Response) {
  const data = await svc.listContractTemplates();
  sendSuccess(res, data);
}

export async function createTemplate(req: AuthRequest, res: Response) {
  const input = createContractTemplateSchema.parse(req.body);
  const template = await svc.createContractTemplate(input, req.user!.id);

  await logAudit(
    "CREATE",
    "contract_templates",
    template.id,
    buildAuditContext(req.user!, req.ip),
    `Created contract template: ${input.name} (${input.contractType})`,
  );

  sendSuccess(res, template, "Template created", 201);
}

export async function updateTemplate(req: AuthRequest, res: Response) {
  const input = updateContractTemplateSchema.parse(req.body);
  const template = await svc.updateContractTemplate(req.params.id, input);

  await logAudit(
    "UPDATE",
    "contract_templates",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Updated contract template: ${template.name}`,
  );

  sendSuccess(res, template, "Template updated");
}

export async function deactivateTemplate(req: AuthRequest, res: Response) {
  const template = await svc.deactivateContractTemplate(req.params.id);

  await logAudit(
    "DELETE",
    "contract_templates",
    req.params.id,
    buildAuditContext(req.user!, req.ip),
    `Deactivated contract template: ${template.name}`,
  );

  sendSuccess(res, template, "Template deactivated");
}

const PREVIEW_PLACEHOLDERS: Record<string, string> = {
  "player.name": "اسم اللاعب",
  "player.nationalId": "1234567890",
  "player.nationality": "سعودي",
  "player.phone": "05XXXXXXXX",
  "contract.startDate": "2026/01/01",
  "contract.endDate": "2028/01/01",
  "commission.pct": "10",
};

export async function previewTemplatePdf(req: AuthRequest, res: Response) {
  const template = await svc.getContractTemplate(req.params.id);
  const body = template.bodyHtml ?? "<p>(empty template)</p>";
  const resolved = applyMinimalTags(body, PREVIEW_PLACEHOLDERS);
  const buffer = await renderContractPdf(resolved);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Content-Disposition", "inline; filename=template-preview.pdf");
  res.end(buffer);
}
