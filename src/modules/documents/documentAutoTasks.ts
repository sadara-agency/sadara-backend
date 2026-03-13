/**
 * Document Auto-Task Generator (Cron)
 *
 *  22. document_expiry_30d     — document expiring in 30 days
 *  23. document_expiry_7d      — document expiring in 7 days
 *  24. player_missing_documents — player missing Passport/Medical/ID
 */

import { Op, QueryTypes } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
  cfg,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── 22 & 23. Document expiry auto-tasks ──

export async function checkDocumentExpiryTasks(): Promise<{ created: number }> {
  let created = 0;

  const rules = [
    {
      ruleId: "document_expiry_30d",
      days: 30,
      priority: "medium" as const,
      roles: ["Manager"],
    },
    {
      ruleId: "document_expiry_7d",
      days: 7,
      priority: "high" as const,
      roles: ["Manager", "Admin"],
    },
  ];

  for (const rule of rules) {
    const rc = cfg(rule.ruleId);
    if (!rc.enabled) continue;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (rc.threshold ?? rule.days));
    const now = new Date();

    const docs = (await sequelize.query(
      `SELECT d.id, d.type, d.status, d.expiry_date,
              d.entity_type, d.entity_id,
              p.id AS player_id, p.first_name, p.last_name,
              p.first_name_ar, p.last_name_ar, p.agent_id
       FROM documents d
       LEFT JOIN players p ON d.entity_type = 'Player' AND p.id::text = d.entity_id
       WHERE d.expiry_date BETWEEN :now AND :target
         AND d.status != 'Expired'`,
      {
        replacements: {
          now: now.toISOString().split("T")[0],
          target: targetDate.toISOString().split("T")[0],
        },
        type: QueryTypes.SELECT,
      },
    )) as any[];

    for (const doc of docs) {
      const playerName = doc.first_name
        ? `${doc.first_name} ${doc.last_name}`.trim()
        : null;
      const playerNameAr = doc.first_name_ar
        ? `${doc.first_name_ar} ${doc.last_name_ar || ""}`.trim()
        : playerName;

      const context = playerName ? ` for ${playerName}` : "";
      const contextAr = playerNameAr ? ` لـ ${playerNameAr}` : "";
      const assignee =
        doc.agent_id ?? (await findUserByRole("Manager"))?.id ?? null;

      const task = await createAutoTaskIfNotExists(
        {
          ruleId: rule.ruleId,
          title: `Document expiring: ${doc.type}${context}`,
          titleAr: `انتهاء مستند: ${doc.type}${contextAr}`,
          description: `${doc.type} document${context} expires on ${doc.expiry_date}. Renew or update the document before expiry.`,
          descriptionAr: `مستند ${doc.type}${contextAr} ينتهي في ${doc.expiry_date}. التجديد أو التحديث قبل انتهاء الصلاحية.`,
          type: "General",
          priority: rule.priority,
          assignedTo: assignee,
          playerId: doc.player_id ?? null,
        },
        {
          roles: rule.roles,
          link: "/dashboard/documents",
        },
      );
      if (task) created++;
    }
  }

  return { created };
}

// ── 24. Player missing required documents ──

export async function checkPlayerMissingDocuments(): Promise<{
  created: number;
}> {
  const rc = cfg("player_missing_documents");
  if (!rc.enabled) return { created: 0 };

  const requiredTypes = ["Passport", "Medical", "ID"];

  // Get active players
  const players = await Player.findAll({
    where: { status: "active" },
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "agentId",
    ],
  });

  let created = 0;
  for (const player of players) {
    // Check which required document types exist
    const existingDocs = (await sequelize.query(
      `SELECT DISTINCT type FROM documents
       WHERE entity_type = 'Player' AND entity_id = :playerId
         AND status IN ('Active', 'Valid')
         AND type IN (:types)`,
      {
        replacements: { playerId: player.id, types: requiredTypes },
        type: QueryTypes.SELECT,
      },
    )) as any[];

    const existingTypes = existingDocs.map((d: any) => d.type);
    const missingTypes = requiredTypes.filter(
      (t) => !existingTypes.includes(t),
    );

    if (missingTypes.length === 0) continue;

    const playerName = `${player.firstName} ${player.lastName}`.trim();
    const playerNameAr = player.firstNameAr
      ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
      : playerName;

    const assignee =
      (player as any).agentId ?? (await findUserByRole("Manager"))?.id ?? null;

    const task = await createAutoTaskIfNotExists(
      {
        ruleId: "player_missing_documents",
        title: `Missing documents: ${playerName}`,
        titleAr: `مستندات ناقصة: ${playerNameAr}`,
        description: `${playerName} is missing required documents: ${missingTypes.join(", ")}. Upload or verify these documents.`,
        descriptionAr: `${playerNameAr} ينقصه مستندات مطلوبة: ${missingTypes.join(", ")}.`,
        type: "General",
        priority: "high",
        assignedTo: assignee,
        playerId: player.id,
      },
      {
        roles: ["Manager"],
        link: "/dashboard/documents",
      },
    );
    if (task) created++;
  }

  return { created };
}
