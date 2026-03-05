/**
 * GDPR Compliance Service
 *
 * Provides right-to-access (data export) and right-to-erasure
 * (anonymization) for player personal data.
 */

import { Op } from "sequelize";
import { sequelize } from "../../config/database";
import { AppError } from "../../middleware/errorHandler";
import { Player } from "../players/player.model";
import { User } from "../Users/user.model";
import { Contract } from "../contracts/contract.model";
import { Injury, InjuryUpdate } from "../injuries/injury.model";
import { Document } from "../documents/document.model";
import { Note } from "../notes/note.model";
import {
  Invoice,
  Payment,
  LedgerEntry,
  Valuation,
} from "../finance/finance.model";
import { Offer } from "../offers/offer.model";
import { Referral } from "../referrals/referral.model";
import { Clearance } from "../clearances/clearance.model";
import {
  TrainingEnrollment,
  TrainingActivity,
} from "../training/training.model";
import { TechnicalReport } from "../reports/report.model";
import { PlayerMatchStats } from "../matches/playerMatchStats.model";
import { ExternalProviderMapping } from "../players/externalProvider.model";

// ── Right to Access ──

export async function exportPlayerData(playerId: string) {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  // Gather all contract & injury IDs first (needed for polymorphic queries)
  const contracts = await Contract.findAll({ where: { playerId } });
  const contractIds = contracts.map((c) => c.id);

  const injuries = await Injury.findAll({ where: { playerId } });
  const injuryIds = injuries.map((i) => i.id);

  // Parallel fetch across all remaining models
  const [
    userAccount,
    injuryUpdates,
    playerDocs,
    contractDocs,
    playerNotes,
    contractNotes,
    injuryNotes,
    invoices,
    payments,
    ledgerEntries,
    valuations,
    matchStats,
    enrollments,
    activities,
    offers,
    referrals,
    clearances,
    externalMappings,
    technicalReports,
  ] = await Promise.all([
    User.findOne({
      where: { playerId },
      attributes: [
        "id",
        "email",
        "fullName",
        "fullNameAr",
        "role",
        "avatarUrl",
        "isActive",
        "lastLogin",
        "notificationPreferences",
        "createdAt",
      ],
    }),
    InjuryUpdate.findAll({
      where: { injuryId: { [Op.in]: injuryIds } },
    }),
    Document.findAll({
      where: { entityType: "Player", entityId: playerId },
    }),
    contractIds.length > 0
      ? Document.findAll({
          where: { entityType: "Contract", entityId: { [Op.in]: contractIds } },
        })
      : Promise.resolve([]),
    Note.findAll({
      where: { ownerType: "Player", ownerId: playerId },
    }),
    contractIds.length > 0
      ? Note.findAll({
          where: {
            ownerType: "Contract",
            ownerId: { [Op.in]: contractIds },
          },
        })
      : Promise.resolve([]),
    injuryIds.length > 0
      ? Note.findAll({
          where: { ownerType: "Injury", ownerId: { [Op.in]: injuryIds } },
        })
      : Promise.resolve([]),
    Invoice.findAll({ where: { playerId } }),
    Payment.findAll({ where: { playerId } }),
    LedgerEntry.findAll({ where: { playerId } }),
    Valuation.findAll({ where: { playerId } }),
    PlayerMatchStats.findAll({ where: { playerId } }),
    TrainingEnrollment.findAll({ where: { playerId } }),
    TrainingActivity.findAll({ where: { playerId } }),
    Offer.findAll({ where: { playerId } }),
    Referral.findAll({ where: { playerId } }),
    Clearance.findAll({ where: { playerId } }),
    ExternalProviderMapping.findAll({ where: { playerId } }),
    TechnicalReport.findAll({
      where: { playerId },
      attributes: { exclude: ["filePath"] },
    }),
  ]);

  // Group injury updates by injury
  const injuryData = injuries.map((inj) => ({
    ...inj.toJSON(),
    updates: injuryUpdates
      .filter((u: any) => u.injuryId === inj.id)
      .map((u: any) => u.toJSON()),
  }));

  // Respect isRestricted on referrals
  const referralData = referrals.map((r: any) => {
    const json = r.toJSON();
    if (json.isRestricted) {
      return {
        id: json.id,
        referralType: json.referralType,
        status: json.status,
        priority: json.priority,
        createdAt: json.createdAt,
        isRestricted: true,
      };
    }
    return json;
  });

  return {
    exportedAt: new Date().toISOString(),
    dataSubject: {
      playerId: player.id,
      fullName: `${player.firstName} ${player.lastName}`,
    },
    personalInfo: player.toJSON(),
    userAccount: userAccount?.toJSON() ?? null,
    contracts: contracts.map((c) => c.toJSON()),
    finance: {
      invoices: invoices.map((i: any) => i.toJSON()),
      payments: payments.map((p: any) => p.toJSON()),
      ledgerEntries: ledgerEntries.map((l: any) => l.toJSON()),
      valuations: valuations.map((v: any) => v.toJSON()),
    },
    injuries: injuryData,
    documents: [
      ...playerDocs.map((d) => d.toJSON()),
      ...contractDocs.map((d: any) => d.toJSON()),
    ],
    notes: [
      ...playerNotes.map((n) => n.toJSON()),
      ...contractNotes.map((n: any) => n.toJSON()),
      ...injuryNotes.map((n: any) => n.toJSON()),
    ],
    matchStats: matchStats.map((s: any) => s.toJSON()),
    training: {
      enrollments: enrollments.map((e: any) => e.toJSON()),
      activities: activities.map((a: any) => a.toJSON()),
    },
    offers: offers.map((o: any) => o.toJSON()),
    referrals: referralData,
    clearances: clearances.map((c: any) => c.toJSON()),
    externalProviders: externalMappings.map((m: any) => m.toJSON()),
    technicalReports: technicalReports.map((r: any) => r.toJSON()),
  };
}

// ── Right to Erasure ──

export interface AnonymizeResult {
  anonymizedTables: string[];
}

export async function anonymizePlayerData(
  playerId: string,
): Promise<AnonymizeResult> {
  const player = await Player.findByPk(playerId);
  if (!player) throw new AppError("Player not found", 404);

  if (player.firstName === "[REDACTED]") {
    throw new AppError("Player data has already been anonymized", 409);
  }

  const activeContracts = await Contract.count({
    where: { playerId, status: "Active" },
  });
  if (activeContracts > 0) {
    throw new AppError(
      "Cannot anonymize player with active contracts. Terminate or transfer contracts first.",
      400,
    );
  }

  // Gather related IDs for polymorphic tables
  const contractIds = (
    await Contract.findAll({
      where: { playerId },
      attributes: ["id"],
    })
  ).map((c) => c.id);

  const injuryIds = (
    await Injury.findAll({
      where: { playerId },
      attributes: ["id"],
    })
  ).map((i) => i.id);

  const anonymizedTables: string[] = [];

  await sequelize.transaction(async (t) => {
    const txOpts = { transaction: t };

    // 1. Player
    await Player.update(
      {
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        firstNameAr: null,
        lastNameAr: null,
        dateOfBirth: "1900-01-01",
        nationality: null,
        email: null,
        phone: null,
        guardianName: null,
        guardianPhone: null,
        guardianRelation: null,
        heightCm: null,
        weightKg: null,
        notes: null,
        photoUrl: null,
        status: "inactive",
      } as any,
      { where: { id: playerId }, ...txOpts },
    );
    anonymizedTables.push("players");

    // 2. Contracts
    if (contractIds.length > 0) {
      await Contract.update(
        {
          agentName: null,
          agentLicense: null,
          notes: null,
          baseSalary: null,
          signingBonus: 0,
          releaseClause: null,
          performanceBonus: 0,
          commissionPct: null,
          totalCommission: null,
          documentUrl: null,
          signedDocumentUrl: null,
          agentSignatureData: null,
        } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("contracts");
    }

    // 3. Injuries
    if (injuryIds.length > 0) {
      await Injury.update(
        {
          diagnosis: null,
          diagnosisAr: null,
          treatment: null,
          treatmentPlan: null,
          treatmentPlanAr: null,
          surgeon: null,
          surgeonName: null,
          facility: null,
          medicalProvider: null,
          notes: null,
        } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("injuries");

      // InjuryUpdates
      await InjuryUpdate.update(
        { notes: null, notesAr: null } as any,
        { where: { injuryId: { [Op.in]: injuryIds } }, ...txOpts },
      );
      anonymizedTables.push("injury_updates");
    }

    // 4. Documents (Player + Contract linked)
    const docWhere = {
      [Op.or]: [
        { entityType: "Player", entityId: playerId },
        ...(contractIds.length > 0
          ? [{ entityType: "Contract", entityId: { [Op.in]: contractIds } }]
          : []),
      ],
    };
    const docCount = await Document.count({ where: docWhere, ...txOpts });
    if (docCount > 0) {
      await Document.update(
        {
          name: "[REDACTED]",
          entityLabel: null,
          fileUrl: "[REDACTED]",
          notes: null,
        } as any,
        { where: docWhere, ...txOpts },
      );
      anonymizedTables.push("documents");
    }

    // 5. Notes (Player + Contract + Injury owned)
    const noteWhere = {
      [Op.or]: [
        { ownerType: "Player", ownerId: playerId },
        ...(contractIds.length > 0
          ? [{ ownerType: "Contract", ownerId: { [Op.in]: contractIds } }]
          : []),
        ...(injuryIds.length > 0
          ? [{ ownerType: "Injury", ownerId: { [Op.in]: injuryIds } }]
          : []),
      ],
    };
    const noteCount = await Note.count({ where: noteWhere, ...txOpts });
    if (noteCount > 0) {
      await Note.update(
        { content: "[REDACTED]" } as any,
        { where: noteWhere, ...txOpts },
      );
      anonymizedTables.push("notes");
    }

    // 6. Finance
    const invCount = await Invoice.count({
      where: { playerId },
      ...txOpts,
    });
    if (invCount > 0) {
      await Invoice.update(
        { description: null } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("invoices");
    }

    const payCount = await Payment.count({
      where: { playerId },
      ...txOpts,
    });
    if (payCount > 0) {
      await Payment.update(
        { notes: null, reference: null, payer: null } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("payments");
    }

    const ledgerCount = await LedgerEntry.count({
      where: { playerId },
      ...txOpts,
    });
    if (ledgerCount > 0) {
      await LedgerEntry.update(
        { description: null } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("ledger_entries");
    }

    const valCount = await Valuation.count({
      where: { playerId },
      ...txOpts,
    });
    if (valCount > 0) {
      await Valuation.update(
        { notes: null, source: null } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("valuations");
    }

    // 7. Offers
    const offerCount = await Offer.count({
      where: { playerId },
      ...txOpts,
    });
    if (offerCount > 0) {
      await Offer.update(
        {
          transferFee: null,
          salaryOffered: null,
          agentFee: null,
          conditions: null,
          counterOffer: null,
          notes: null,
        } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("offers");
    }

    // 8. Referrals
    const refCount = await Referral.count({
      where: { playerId },
      ...txOpts,
    });
    if (refCount > 0) {
      await Referral.update(
        { triggerDesc: null, outcome: null, notes: null } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("referrals");
    }

    // 9. Clearances
    const clrCount = await Clearance.count({
      where: { playerId },
      ...txOpts,
    });
    if (clrCount > 0) {
      await Clearance.update(
        {
          reason: "[REDACTED]",
          outstandingDetails: null,
          declarationText: null,
          signedDocumentUrl: null,
          notes: null,
        } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("clearances");
    }

    // 10. Training
    const enrollCount = await TrainingEnrollment.count({
      where: { playerId },
      ...txOpts,
    });
    if (enrollCount > 0) {
      await TrainingEnrollment.update(
        { notes: null } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("training_enrollments");
    }

    const actCount = await TrainingActivity.count({
      where: { playerId },
      ...txOpts,
    });
    if (actCount > 0) {
      await TrainingActivity.update(
        { metadata: null } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("training_activities");
    }

    // 11. Technical Reports
    const repCount = await TechnicalReport.count({
      where: { playerId },
      ...txOpts,
    });
    if (repCount > 0) {
      await TechnicalReport.update(
        {
          title: "[REDACTED]",
          filePath: null,
          notes: null,
          periodParams: {},
        } as any,
        { where: { playerId }, ...txOpts },
      );
      anonymizedTables.push("technical_reports");
    }

    // 12. External Provider Mappings (hard delete)
    const extCount = await ExternalProviderMapping.destroy({
      where: { playerId },
      ...txOpts,
    });
    if (extCount > 0) {
      anonymizedTables.push("external_provider_mappings");
    }

    // 13. Linked User account
    const userAccount = await User.findOne({
      where: { playerId },
      ...txOpts,
    });
    if (userAccount) {
      await userAccount.update(
        {
          email: `anonymized-${playerId.slice(0, 8)}@redacted.local`,
          fullName: "[REDACTED]",
          fullNameAr: null,
          avatarUrl: null,
          isActive: false,
          passwordHash: "ANONYMIZED",
          resetToken: null,
          resetTokenExpiry: null,
          inviteToken: null,
          inviteTokenExpiry: null,
          notificationPreferences: {},
        } as any,
        { transaction: t },
      );
      anonymizedTables.push("users");
    }
  });

  return { anonymizedTables };
}
