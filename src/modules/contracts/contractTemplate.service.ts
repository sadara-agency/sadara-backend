import { ContractTemplate } from "@modules/contracts/contractTemplate.model";
import { sanitizeContractHtml } from "@modules/contracts/contractSanitize";
import { AppError } from "@middleware/errorHandler";
import type {
  CreateContractTemplateInput,
  UpdateContractTemplateInput,
} from "@modules/contracts/contractTemplate.validation";

export async function listContractTemplates() {
  return ContractTemplate.findAll({
    order: [
      ["contractType", "ASC"],
      ["name", "ASC"],
    ],
  });
}

export async function getContractTemplate(id: string) {
  const template = await ContractTemplate.findByPk(id);
  if (!template) throw new AppError("Contract template not found", 404);
  return template;
}

export async function createContractTemplate(
  input: CreateContractTemplateInput,
  userId?: string,
) {
  return ContractTemplate.create({
    name: input.name,
    nameAr: input.nameAr ?? null,
    contractType: input.contractType,
    category: input.category,
    defaultValues: input.defaultValues ?? {},
    bodyHtml: input.bodyHtml ? sanitizeContractHtml(input.bodyHtml) : null,
    bodyJson: (input.bodyJson as Record<string, unknown> | undefined) ?? null,
    isDefault: input.isDefault ?? false,
    createdBy: userId ?? null,
  });
}

export async function updateContractTemplate(
  id: string,
  input: UpdateContractTemplateInput,
) {
  const template = await ContractTemplate.findByPk(id);
  if (!template) throw new AppError("Contract template not found", 404);

  if (input.name !== undefined) template.name = input.name;
  if (input.nameAr !== undefined) template.nameAr = input.nameAr;
  if (input.contractType !== undefined)
    template.contractType = input.contractType;
  if (input.category !== undefined) template.category = input.category;
  if (input.defaultValues !== undefined)
    template.defaultValues = input.defaultValues;
  if (input.bodyHtml !== undefined) {
    template.bodyHtml = input.bodyHtml
      ? sanitizeContractHtml(input.bodyHtml)
      : null;
  }
  if (input.bodyJson !== undefined) {
    template.bodyJson =
      (input.bodyJson as Record<string, unknown> | null) ?? null;
  }
  if (input.isDefault !== undefined) template.isDefault = input.isDefault;
  if (input.isActive !== undefined) template.isActive = input.isActive;

  await template.save();
  return template;
}

export async function deactivateContractTemplate(id: string) {
  const template = await ContractTemplate.findByPk(id);
  if (!template) throw new AppError("Contract template not found", 404);
  await template.update({ isActive: false });
  return template;
}
