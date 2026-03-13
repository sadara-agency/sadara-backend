/**
 * Gate Auto-Task Generator
 *
 * Real-time trigger:
 *  27. gate_completed_next — Gate completed, next gate initialized → Manager
 */

import { Gate } from "@modules/gates/gate.model";
import { Player } from "@modules/players/player.model";
import {
  createAutoTaskIfNotExists,
  findUserByRole,
} from "@shared/utils/autoTaskHelpers";
import { logger } from "@config/logger";

// ── 27. Gate completed → Manager task for next gate ──

export async function generateGateCompletedTask(
  gateId: string,
  completedBy: string,
) {
  const gate = await Gate.findByPk(gateId, {
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
  if (!gate) return;
  if (gate.status !== "Completed") return;

  const player = (gate as any).player;
  const playerName = player
    ? `${player.firstName} ${player.lastName}`.trim()
    : "Unknown";
  const playerNameAr = player?.firstNameAr
    ? `${player.firstNameAr} ${player.lastNameAr || ""}`.trim()
    : playerName;

  const manager = await findUserByRole("Manager");

  await createAutoTaskIfNotExists(
    {
      ruleId: "gate_completed_next",
      title: `Gate ${gate.gateNumber} completed: ${playerName}`,
      titleAr: `اكتمال البوابة ${gate.gateNumber}: ${playerNameAr}`,
      description: `Gate ${gate.gateNumber} has been completed for ${playerName}. Review progress and ensure the next gate is on track.`,
      descriptionAr: `تم إكمال البوابة ${gate.gateNumber} للاعب ${playerNameAr}. راجع التقدم وتأكد من سير البوابة التالية.`,
      type: "General",
      priority: "medium",
      assignedTo: manager?.id ?? null,
      assignedBy: completedBy,
      playerId: gate.playerId,
      dueDays: 5,
    },
    {
      roles: ["Manager", "Admin"],
      link: `/dashboard/gates/${gate.playerId}`,
    },
  );
}
