import { Response } from "express";
import { AuthRequest } from "@shared/types";
import { sendSuccess } from "@shared/utils/apiResponse";
import { logAudit, buildAuditContext } from "@shared/utils/audit";
import * as svc from "@modules/contracts/contractTemplate.service";
import {
  createContractTemplateSchema,
  updateContractTemplateSchema,
} from "@modules/contracts/contractTemplate.validation";
import { renderContractPdf } from "@modules/contracts/contractDocument.service";
import { resolveMergeTags } from "@modules/contracts/contractMergeTags";
import { sanitizeContractHtml } from "@modules/contracts/contractSanitize";

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
  "player.nameEn": "Player Name",
  "player.nationalId": "1234567890",
  "player.nationality": "سعودي",
  "player.phone": "05XXXXXXXX",
  "contract.startDate": "01 / 06 / 2026م",
  "contract.endDate": "01 / 06 / 2028م",
  "contract.duration": "سنتان (24 شهرًا)",
  "commission.pct": "10",
  "contract.displayId": "CON-26-0001",
  "agent.name": "Ahmed Osman Hadoug",
  "agent.license": "202411-8478",
  today: "10 / 06 / 2026م",
};

export async function previewTemplatePdf(req: AuthRequest, res: Response) {
  const template = await svc.getContractTemplate(req.params.id);
  const posted = (req.body?.bodyHtml as string | undefined) ?? undefined;
  const rawBody =
    typeof posted === "string" && posted.trim().length > 0
      ? posted
      : (template.bodyHtml ?? "<p>(empty template)</p>");
  const body = sanitizeContractHtml(rawBody);
  const resolved = resolveMergeTags(body, PREVIEW_PLACEHOLDERS);
  const buffer = await renderContractPdf(resolved);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Content-Disposition", "inline; filename=template-preview.pdf");
  res.end(buffer);
}
