import { Op } from "sequelize";
import { sequelize } from "@config/database";
import { Player } from "@modules/players/player.model";
import { Journey } from "@modules/journey/journey.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { Injury } from "@modules/injuries/injury.model";

export type AttentionLevel = "red" | "amber" | "green";

export interface PlayerAttention {
  playerId: string;
  playerName: string;
  playerNameAr: string;
  club: string | null;
  position: string | null;
  photoUrl: string | null;
  attentionLevel: AttentionLevel;
  reasons: string[];
  // Journey
  journeyProgress: {
    current: number;
    total: number;
    currentStageName: string | null;
  } | null;
  // Tickets
  openTickets: number;
  urgentTickets: number;
  // Sessions
  daysSinceLastSession: number | null;
  lastSessionDate: string | null;
  // Injuries
  activeInjury: boolean;
  injurySeverity: string | null;
}

/**
 * Computes attention level per player based on:
 * - Open urgent tickets → red if any overdue
 * - Days since last session → amber if > 7, red if > 14
 * - Journey health → carries through
 * - Active injuries → amber/red based on severity
 */
export async function getPlayerAttentionData(): Promise<PlayerAttention[]> {
  // Get all active players
  const players = await Player.findAll({
    where: { status: "active" },
    attributes: [
      "id",
      "firstName",
      "lastName",
      "firstNameAr",
      "lastNameAr",
      "currentClubId",
      "position",
      "photoUrl",
    ],
    raw: true,
  });

  if (!players.length) return [];

  const playerIds = players.map((p: any) => p.id);

  // Fetch all data in parallel
  const [openTickets, journeyStages, activeInjuries, lastSessions] =
    await Promise.all([
      // Open tickets per player
      Ticket.findAll({
        attributes: [
          "playerId",
          [sequelize.fn("COUNT", sequelize.col("id")), "openCount"],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                `CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END`,
              ),
            ),
            "urgentCount",
          ],
          [
            sequelize.fn(
              "SUM",
              sequelize.literal(
                `CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('Completed','Cancelled') THEN 1 ELSE 0 END`,
              ),
            ),
            "overdueCount",
          ],
        ],
        where: {
          playerId: { [Op.in]: playerIds },
          status: { [Op.notIn]: ["Completed", "Cancelled"] },
        },
        group: ["playerId"],
        raw: true,
      }) as Promise<any[]>,

      // Journey stages (latest InProgress per player)
      Journey.findAll({
        where: {
          playerId: { [Op.in]: playerIds },
        },
        order: [["stageOrder", "ASC"]],
        raw: true,
      }) as Promise<any[]>,

      // Active injuries per player
      Injury.findAll({
        where: {
          playerId: { [Op.in]: playerIds },
          status: { [Op.notIn]: ["Recovered"] },
        },
        attributes: ["playerId", "severity", "status"],
        raw: true,
      }) as Promise<any[]>,

      // Last session (referral) per player
      sequelize.query<{ player_id: string; last_date: string }>(
        `SELECT player_id, MAX(created_at) as last_date
         FROM referrals
         WHERE player_id = ANY($1)
         GROUP BY player_id`,
        {
          bind: [playerIds],
          type: "SELECT" as any,
        },
      ),
    ]);

  // Build lookup maps
  const ticketMap = new Map<
    string,
    { openCount: number; urgentCount: number; overdueCount: number }
  >();
  for (const t of openTickets) {
    ticketMap.set(t.playerId ?? t.player_id, {
      openCount: Number(t.openCount ?? t.open_count ?? 0),
      urgentCount: Number(t.urgentCount ?? t.urgent_count ?? 0),
      overdueCount: Number(t.overdueCount ?? t.overdue_count ?? 0),
    });
  }

  const journeyMap = new Map<string, any[]>();
  for (const s of journeyStages) {
    const pid = s.playerId ?? s.player_id;
    if (!journeyMap.has(pid)) journeyMap.set(pid, []);
    journeyMap.get(pid)!.push(s);
  }

  const injuryMap = new Map<string, any>();
  for (const i of activeInjuries) {
    const pid = i.playerId ?? i.player_id;
    // Keep the most severe
    const existing = injuryMap.get(pid);
    const sevOrder: Record<string, number> = {
      Critical: 4,
      Severe: 3,
      Moderate: 2,
      Minor: 1,
    };
    if (
      !existing ||
      (sevOrder[i.severity] ?? 0) > (sevOrder[existing.severity] ?? 0)
    ) {
      injuryMap.set(pid, i);
    }
  }

  const sessionMap = new Map<string, string>();
  for (const s of lastSessions as any[]) {
    sessionMap.set(s.player_id, s.last_date);
  }

  // Compute attention per player
  const now = new Date();
  const results: PlayerAttention[] = [];

  for (const p of players as any[]) {
    const reasons: string[] = [];
    let level: AttentionLevel = "green";

    const tickets = ticketMap.get(p.id);
    const stages = journeyMap.get(p.id) ?? [];
    const injury = injuryMap.get(p.id);
    const lastDate = sessionMap.get(p.id);

    // Ticket analysis
    const openCount = tickets?.openCount ?? 0;
    const urgentCount = tickets?.urgentCount ?? 0;
    const overdueCount = tickets?.overdueCount ?? 0;

    if (overdueCount > 0) {
      level = "red";
      reasons.push(`${overdueCount} overdue ticket(s)`);
    } else if (urgentCount > 0) {
      level = "amber";
      reasons.push(`${urgentCount} urgent ticket(s)`);
    }

    // Session gap analysis
    let daysSince: number | null = null;
    if (lastDate) {
      daysSince = Math.floor(
        (now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSince > 14) {
        level = "red";
        reasons.push(`No session in ${daysSince} days`);
      } else if (daysSince > 7) {
        if (level !== "red") level = "amber";
        reasons.push(`Last session ${daysSince} days ago`);
      }
    }

    // Injury analysis
    if (injury) {
      if (["Critical", "Severe"].includes(injury.severity)) {
        level = "red";
        reasons.push(`Active ${injury.severity.toLowerCase()} injury`);
      } else {
        if (level !== "red") level = "amber";
        reasons.push("Active injury");
      }
    }

    // Journey progress
    let journeyProgress = null;
    if (stages.length) {
      const completed = stages.filter(
        (s: any) => s.status === "Completed",
      ).length;
      const current = stages.find((s: any) => s.status === "InProgress");
      journeyProgress = {
        current: completed,
        total: stages.length,
        currentStageName: current?.stage_name ?? current?.stageName ?? null,
      };

      // Check if any stage is overdue
      const overdueStage = stages.find((s: any) => {
        const endDate = s.expected_end_date ?? s.expectedEndDate;
        return endDate && s.status !== "Completed" && new Date(endDate) < now;
      });
      if (overdueStage) {
        if (level !== "red") level = "amber";
        reasons.push("Journey stage overdue");
      }
    }

    results.push({
      playerId: p.id,
      playerName: `${p.firstName ?? p.first_name} ${p.lastName ?? p.last_name}`,
      playerNameAr:
        `${p.firstNameAr ?? p.first_name_ar ?? ""} ${p.lastNameAr ?? p.last_name_ar ?? ""}`.trim(),
      club: null, // Could join clubs table if needed
      position: p.position,
      photoUrl: p.photoUrl ?? p.photo_url ?? null,
      attentionLevel: level,
      reasons,
      journeyProgress,
      openTickets: openCount,
      urgentTickets: urgentCount,
      daysSinceLastSession: daysSince,
      lastSessionDate: lastDate ?? null,
      activeInjury: !!injury,
      injurySeverity: injury?.severity ?? null,
    });
  }

  // Sort: red first, then amber, then green
  const levelOrder: Record<string, number> = { red: 0, amber: 1, green: 2 };
  results.sort(
    (a, b) => levelOrder[a.attentionLevel] - levelOrder[b.attentionLevel],
  );

  return results;
}
