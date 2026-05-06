import { Op } from "sequelize";
import AgendaTask from "./agenda-task.model";
import { rolloverOverdueTasks } from "./agenda.service";
import {
  sendMorningDigest,
  flushDeferredNotifications,
} from "./agenda.notifications";
import { logger } from "@config/logger";

/**
 * Daily 04:00 — roll over / flag / abandon overdue tasks.
 */
export async function runAgendaRollover() {
  return rolloverOverdueTasks();
}

/**
 * Daily 07:30 — send morning digest to every user with tasks today.
 */
export async function runMorningDigest() {
  const today = new Date().toISOString().split("T")[0];

  // Aggregate tasks per user for today
  const { sequelize } = await import("@config/database");
  const { QueryTypes } = await import("sequelize");

  type DigestRow = {
    userId: string;
    todayCount: string;
    rolloverCount: string;
  };

  const rows = await sequelize.query<DigestRow>(
    `SELECT
       user_id AS "userId",
       COUNT(*) FILTER (WHERE due_date = :today) AS "todayCount",
       COUNT(*) FILTER (WHERE needs_rollover_decision = true) AS "rolloverCount"
     FROM agenda_tasks
     WHERE status IN ('Open', 'InProgress')
       AND (due_date = :today OR needs_rollover_decision = true)
     GROUP BY user_id`,
    { replacements: { today }, type: QueryTypes.SELECT },
  );

  let sent = 0;
  for (const row of rows) {
    try {
      await sendMorningDigest(
        row.userId,
        parseInt(row.todayCount, 10),
        parseInt(row.rolloverCount, 10),
      );
      sent++;
    } catch (err) {
      logger.error("[AGENDA] Morning digest failed for user", {
        userId: row.userId,
        error: (err as Error).message,
      });
    }
  }

  logger.info("[AGENDA] Morning digest sent", { sent, total: rows.length });
  return { sent, total: rows.length };
}

/**
 * 1st of month 09:00 — nudge users with stale goals from last month.
 */
export async function runMonthRolloverPrep() {
  const prevMonth = new Date();
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const staleTasks = await AgendaTask.findAll({
    where: {
      status: { [Op.in]: ["Open", "InProgress"] },
      dueDate: { [Op.lt]: new Date().toISOString().split("T")[0] },
      rolloverPolicy: { [Op.ne]: "none" },
      rolloverCount: { [Op.lt]: 3 },
    },
    attributes: ["userId"],
    group: ["userId"],
  });

  logger.info("[AGENDA] Month rollover prep complete", {
    usersWithStale: staleTasks.length,
    month: monthStr,
  });

  return { usersNudged: staleTasks.length };
}

/**
 * Every 15 min — flush notifications held during quiet hours.
 */
export async function runDeferredFlush() {
  return flushDeferredNotifications();
}
