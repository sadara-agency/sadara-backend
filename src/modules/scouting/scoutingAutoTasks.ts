// ─────────────────────────────────────────────────────────────
// scoutingAutoTasks.ts
// Auto-task fan-out for scouting events.
//
// When a SelectionDecision is recorded as "Approved", we create
// one Task per active Manager: "Create player profile for {prospect}".
// First Manager to complete it cancels the siblings (handled in
// task.service.cancelSiblingTasks via sourceDecisionId).
// ─────────────────────────────────────────────────────────────
import { User } from "@modules/users/user.model";
import { createTask } from "@modules/tasks/task.service";
import { logger } from "@config/logger";
import { ROLES } from "@shared/types";

const FAN_OUT_LIMIT = 50; // safety cap, mirrors notifyByRole's 500 cap at a smaller scale
const DUE_DATE_DAYS = 3;

function dueDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Fan out a "create player profile" task to every active Manager.
 * Called fire-and-forget after a SelectionDecision = "Approved".
 */
export async function createManagerProfileTasks(args: {
  decisionId: string;
  recordedBy: string;
  prospectName: string;
  prospectNameAr: string;
}): Promise<void> {
  const { decisionId, recordedBy, prospectName, prospectNameAr } = args;

  const managers = await User.findAll({
    where: { role: ROLES.MANAGER, isActive: true },
    attributes: ["id"],
    limit: FAN_OUT_LIMIT,
  });

  if (managers.length === 0) {
    logger.warn("No active Managers found for prospect-acceptance fan-out", {
      decisionId,
    });
    return;
  }

  const dueDate = dueDateInDays(DUE_DATE_DAYS);

  await Promise.all(
    managers.map((mgr) =>
      createTask(
        {
          title: `Create player profile for ${prospectName}`,
          titleAr: `إنشاء ملف لاعب لـ ${prospectNameAr}`,
          type: "General",
          priority: "high",
          assignedTo: mgr.id,
          dueDate,
          sourceDecisionId: decisionId,
          isAutoCreated: true,
        } as any,
        recordedBy,
      ).catch((err) => {
        logger.warn("Failed to create manager profile task", {
          managerId: mgr.id,
          decisionId,
          error: (err as Error).message,
        });
      }),
    ),
  );
}
