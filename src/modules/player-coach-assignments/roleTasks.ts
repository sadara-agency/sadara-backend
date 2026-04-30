import type { StaffRole } from "./playerCoachAssignment.model";

export type TaskType =
  | "Match"
  | "Contract"
  | "Health"
  | "Report"
  | "Offer"
  | "General"
  | "Media";

export interface RoleTaskTemplate {
  type: TaskType;
  title: string;
  titleAr: string;
}

/**
 * Maps a staff specialty to the default first task we auto-create when
 * the user is added to a player's working group. Single source of truth —
 * the only place "what's expected from THIS role" is defined.
 *
 * Update this map (and only this map) to change default expectations per role.
 */
const ROLE_TASK_MAP: Record<StaffRole, RoleTaskTemplate> = {
  Analyst: {
    type: "Report",
    title: "Review latest scans and reports",
    titleAr: "مراجعة أحدث الفحوصات والتقارير",
  },
  Scout: {
    type: "Report",
    title: "Complete scouting report",
    titleAr: "إكمال تقرير الكشاف",
  },
  Coach: {
    type: "General",
    title: "Adjust training plan",
    titleAr: "تعديل خطة التدريب",
  },
  SkillCoach: {
    type: "General",
    title: "Adjust training plan",
    titleAr: "تعديل خطة التدريب",
  },
  TacticalCoach: {
    type: "General",
    title: "Review tactical fit and add session plan",
    titleAr: "مراجعة الملاءمة التكتيكية ووضع خطة الجلسة",
  },
  FitnessCoach: {
    type: "General",
    title: "Adjust training plan",
    titleAr: "تعديل خطة التدريب",
  },
  GymCoach: {
    type: "General",
    title: "Set strength program",
    titleAr: "تحديد برنامج القوة",
  },
  GoalkeeperCoach: {
    type: "General",
    title: "Schedule goalkeeper session",
    titleAr: "جدولة جلسة حارس المرمى",
  },
  MentalCoach: {
    type: "General",
    title: "Schedule intake session",
    titleAr: "جدولة جلسة استقبال",
  },
  NutritionSpecialist: {
    type: "Health",
    title: "Build nutrition plan",
    titleAr: "إعداد خطة التغذية",
  },
  Legal: {
    type: "Contract",
    title: "Review contract status",
    titleAr: "مراجعة حالة العقد",
  },
  Finance: {
    type: "General",
    title: "Verify payment schedule",
    titleAr: "التحقق من جدول المدفوعات",
  },
  GraphicDesigner: {
    type: "Media",
    title: "Plan design deliverable",
    titleAr: "تخطيط مهمة تصميمية",
  },
  Manager: {
    type: "General",
    title: "Review player profile",
    titleAr: "مراجعة ملف اللاعب",
  },
  Executive: {
    type: "General",
    title: "Review player profile",
    titleAr: "مراجعة ملف اللاعب",
  },
  Admin: {
    type: "General",
    title: "Review player profile",
    titleAr: "مراجعة ملف اللاعب",
  },
};

export function getRoleTaskTemplate(specialty: StaffRole): RoleTaskTemplate {
  return (
    ROLE_TASK_MAP[specialty] ?? {
      type: "General" as const,
      title: "Review player profile",
      titleAr: "مراجعة ملف اللاعب",
    }
  );
}
