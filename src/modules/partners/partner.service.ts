import { Op } from "sequelize";
import Partner from "./partner.model";
import type { CreatePartnerDTO, UpdatePartnerDTO } from "./partner.validation";
import { AppError } from "@middleware/errorHandler";
import { paginatedQuery } from "@shared/utils/pagination";
import type { PaginationQuery } from "@shared/types";

async function mintReferenceNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SDR-NP-${year}-`;
  const last = await Partner.findOne({
    where: { referenceNo: { [Op.like]: `${prefix}%` } },
    order: [["referenceNo", "DESC"]],
  });
  const seq = last ? parseInt(last.referenceNo.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function listPartners(query: PaginationQuery) {
  return paginatedQuery(Partner, query, {
    defaultSort: "createdAt",
    allowedSorts: ["nameEn", "createdAt", "status", "capacity"],
  });
}

export async function getPartnerById(id: string) {
  const partner = await Partner.findByPk(id);
  if (!partner) throw new AppError("Partner not found", 404);
  return partner;
}

export async function createPartner(data: CreatePartnerDTO, _userId?: string) {
  const existing = await Partner.findOne({
    where: { contactEmail: data.contactEmail },
  });
  if (existing)
    throw new AppError("Partner with this email already exists", 409);
  const referenceNo = await mintReferenceNo();
  return Partner.create({ ...data, referenceNo, status: "Active" });
}

export async function updatePartner(id: string, data: UpdatePartnerDTO) {
  const partner = await getPartnerById(id);
  return partner.update(data);
}

export async function deletePartner(id: string) {
  const partner = await getPartnerById(id);
  await partner.destroy();
  return { id };
}
