import { sequelize } from "@config/database";

/**
 * Add item_ar column to gate_checklists for Arabic translations,
 * and backfill existing rows with Arabic text.
 */

const ARABIC_MAP: Record<string, string> = {
  // Gate 0
  "Collect player identification documents (ID / Passport)":
    "جمع وثائق هوية اللاعب (هوية / جواز سفر)",
  "Obtain signed representation agreement":
    "الحصول على اتفاقية التمثيل الموقعة",
  "Complete medical examination & fitness assessment":
    "إكمال الفحص الطبي وتقييم اللياقة البدنية",
  "Verify player registration with federation":
    "التحقق من تسجيل اللاعب لدى الاتحاد",
  "Upload player photo & profile data": "رفع صورة اللاعب وبيانات الملف الشخصي",
  "Guardian consent form (if youth player)":
    "نموذج موافقة ولي الأمر (إذا كان لاعب ناشئ)",
  // Gate 1
  "Complete initial performance assessment": "إكمال تقييم الأداء الأولي",
  "Create Individual Development Plan (IDP)": "إنشاء خطة التطوير الفردية",
  "Set short-term performance goals": "تحديد أهداف الأداء قصيرة المدى",
  "Assign development coach / mentor": "تعيين مدرب تطوير / مرشد",
  "Record baseline statistics": "تسجيل الإحصائيات الأساسية",
  // Gate 2
  "Mid-season performance review": "مراجعة أداء منتصف الموسم",
  "Update market valuation": "تحديث التقييم السوقي",
  "Review IDP progress & adjust goals":
    "مراجعة تقدم خطة التطوير وتعديل الأهداف",
  "Collect performance data & match statistics":
    "جمع بيانات الأداء وإحصائيات المباريات",
  "Stakeholder feedback report": "تقرير ملاحظات أصحاب المصلحة",
  // Gate 3
  "End-of-season comprehensive review": "المراجعة الشاملة لنهاية الموسم",
  "Contract renewal recommendation": "توصية تجديد العقد",
  "Final market valuation update": "التحديث النهائي للتقييم السوقي",
  "Transfer window strategy assessment": "تقييم استراتيجية نافذة الانتقالات",
  "Player satisfaction interview": "مقابلة رضا اللاعب",
};

export async function up() {
  // Add column
  await sequelize.query(
    `ALTER TABLE gate_checklists ADD COLUMN IF NOT EXISTS item_ar VARCHAR(500)`,
  );

  // Backfill existing rows
  for (const [en, ar] of Object.entries(ARABIC_MAP)) {
    await sequelize.query(
      `UPDATE gate_checklists SET item_ar = :ar WHERE item = :en AND item_ar IS NULL`,
      { replacements: { en, ar } },
    );
  }
}

export async function down() {
  await sequelize.query(
    `ALTER TABLE gate_checklists DROP COLUMN IF EXISTS item_ar`,
  );
}
