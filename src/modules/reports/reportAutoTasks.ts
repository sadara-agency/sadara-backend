/**
 * Report Auto-Task Generator
 *
 * Real-time trigger:
 *  28. report_generation_failed — PDF generation failed → Creator
 */

import { TechnicalReport } from "@modules/reports/report.model";
import { Player } from "@modules/players/player.model";
import { createAutoTaskIfNotExists } from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── 28. Report generation failed → Creator task ──

export async function generateReportFailedTask(
  reportId: string,
  createdBy: string,
) {
  const report = await TechnicalReport.findByPk(reportId, {
    include: [
      {
        model: Player,
        as: "player",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "firstNameAr",
          "lastNameAr",
        ],
      },
    ],
  });
  if (!report) return;

  const player = (report as any).player;
  const playerName = player
    ? `${player.firstName} ${player.lastName}`.trim()
    : "Unknown";
  const playerNameAr = player?.firstNameAr
    ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
    : playerName;

  await createAutoTaskIfNotExists(
    {
      ruleId: "report_generation_failed",
      title: `Report generation failed: ${playerName}`,
      titleAr: `فشل إنشاء التقرير: ${playerNameAr}`,
      description: `The technical report for ${playerName} failed to generate. Please review and retry. Notes: ${report.notes || "N/A"}`,
      descriptionAr: `فشل إنشاء التقرير الفني للاعب ${playerNameAr}. يرجى المراجعة وإعادة المحاولة.`,
      type: "Report",
      priority: "high",
      assignedTo: createdBy,
      assignedBy: createdBy,
      playerId: report.playerId,
      dueDays: 1,
    },
    {
      userIds: [createdBy],
      link: `/dashboard/reports/${reportId}`,
    },
  );
}
