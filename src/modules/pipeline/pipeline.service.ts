// ─────────────────────────────────────────────────────────────
// src/modules/pipeline/pipeline.service.ts
// ─────────────────────────────────────────────────────────────
// NOTE on Partner row-scope for the 'Partner' role:
// AuthUser has no partnerId field. The Partner model has a userId
// column (network_partners.user_id). When the caller is a Partner
// we look up their Partner row via userId to obtain the correct
// partnerId filter for row-scope isolation.
// ─────────────────────────────────────────────────────────────
import { Op } from "sequelize";
import Pipeline from "./pipeline.model";
import Partner from "@modules/partners/partner.model";
import {
  SubmitPlayerDTO,
  AdvancePhaseDTO,
  UpdateSubmissionDTO,
} from "./pipeline.validation";
import { AppError } from "@middleware/errorHandler";
import { paginatedQuery } from "@shared/utils/pagination";
import type { PaginationQuery, AuthUser } from "@shared/types";

const SLA_PHASES = ["Compliance", "Fit-or-Pass"] as const;
const SLA_HOURS = 48;

async function mintSubmissionRef(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SDR-PL-${year}-`;
  const last = await Pipeline.findOne({
    where: { submissionRef: { [Op.like]: `${prefix}%` } },
    order: [["submissionRef", "DESC"]],
  });
  const seq = last
    ? parseInt(last.submissionRef.replace(prefix, ""), 10) + 1
    : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/**
 * Resolve the partnerId for row-scope filtering.
 * AuthUser has no partnerId — we look up by userId (network_partners.user_id).
 * Returns undefined if the user is not a Partner role (no row-scope applied).
 */
async function resolvePartnerIdForUser(
  user: AuthUser,
): Promise<string | undefined> {
  if (user.role !== "Partner") return undefined;
  const partner = await Partner.findOne({ where: { userId: user.id } });
  // If no partner row found for this user, return a sentinel that matches
  // nothing (so they see an empty list rather than all submissions).
  return partner ? partner.id : "NO_PARTNER_ROW";
}

export async function listSubmissions(query: PaginationQuery, user: AuthUser) {
  const scopedPartnerId = await resolvePartnerIdForUser(user);
  const where = scopedPartnerId ? { partnerId: scopedPartnerId } : {};
  return paginatedQuery(Pipeline, query, {
    where,
    include: [
      {
        model: Partner,
        as: "partner",
        attributes: ["id", "nameEn", "referenceNo"],
      },
    ],
    defaultSort: "createdAt",
    allowedSorts: ["createdAt", "playerNameEn", "phase", "submissionRef"],
  });
}

export async function getSubmissionById(id: string) {
  const sub = await Pipeline.findByPk(id, {
    include: [{ model: Partner, as: "partner" }],
  });
  if (!sub) throw new AppError("Submission not found", 404);
  return sub;
}

export async function submitPlayer(data: SubmitPlayerDTO) {
  const partner = await Partner.findByPk(data.partnerId);
  if (!partner) throw new AppError("Partner not found", 404);
  if (partner.status !== "Active")
    throw new AppError("Partner is not active", 422);

  // Conflict detection: same player name (case-insensitive) + DOB already submitted
  let conflictFlag = false;
  let conflictNote: string | undefined;
  if (data.playerNameEn && data.dateOfBirth) {
    const existing = await Pipeline.findOne({
      where: {
        playerNameEn: { [Op.iLike]: data.playerNameEn },
        dateOfBirth: data.dateOfBirth,
      },
      order: [["createdAt", "ASC"]],
    });
    if (existing) {
      conflictFlag = true;
      conflictNote = `Earlier claim holds: ${existing.submissionRef} (submitted ${existing.createdAt.toISOString().slice(0, 10)})`;
    }
  }

  const submissionRef = await mintSubmissionRef();
  return Pipeline.create({
    ...data,
    submissionRef,
    phase: "Registered",
    phaseSince: new Date(),
    nextAction: "Compliance screen",
    conflictFlag,
    conflictNote,
  });
}

export async function advancePhase(id: string, data: AdvancePhaseDTO) {
  const sub = await getSubmissionById(id);
  return sub.update({
    phase: data.phase,
    phaseSince: new Date(),
    nextAction: data.nextAction ?? sub.nextAction,
    dueDate: data.dueDate ?? sub.dueDate,
    hqOwner: data.hqOwner ?? sub.hqOwner,
    notes: data.notes ?? sub.notes,
  });
}

export async function updateSubmission(id: string, data: UpdateSubmissionDTO) {
  const sub = await getSubmissionById(id);
  return sub.update(data);
}

export async function deleteSubmission(id: string) {
  const sub = await getSubmissionById(id);
  await sub.destroy();
  return { id };
}

export async function getSlaBreaches() {
  const cutoff = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000);
  return Pipeline.findAll({
    where: {
      phase: { [Op.in]: [...SLA_PHASES] },
      phaseSince: { [Op.lt]: cutoff },
    },
    include: [
      {
        model: Partner,
        as: "partner",
        attributes: ["nameEn", "contactEmail", "referenceNo"],
      },
    ],
    order: [["phaseSince", "ASC"]],
  });
}
