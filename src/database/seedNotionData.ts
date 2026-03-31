// ─────────────────────────────────────────────────────────────
// seedNotionData.ts
// Imports operational data from the Notion workspace into the
// Sadara platform using existing modules (players, tickets,
// referrals/sessions, journey).
// ─────────────────────────────────────────────────────────────
import { logger } from "@config/logger";
import { Player } from "@modules/players/player.model";
import { Ticket } from "@modules/tickets/ticket.model";
import { Referral } from "@modules/referrals/referral.model";
import { Journey } from "@modules/journey/journey.model";
import { IDS } from "./ids";

// ── Position mapping (Arabic → English enum) ──
const POSITIONS: Record<string, string> = {
  حارس: "Goalkeeper",
  "ظهير أيسر": "Left Back",
  هجومي: "Striker",
  محور: "Defensive Midfielder",
  وسط: "Central Midfielder",
  جناح: "Winger",
  مدافع: "Center Back",
};

// ── Player name → seeded ID lookup ──
const PLAYER_MAP: Record<string, number> = {
  "محمد الشمري-GK": 0, // GK, Age 31, Al-Khulood
  "محمد الشمري": 1, // LB, Age 18, Al-Nasr
  "محمد مجربي": 2,
  "حسام الاسمري": 3,
  "ظاهر عسيري": 4,
  "حسام بخاري": 5,
  "ايس الماملي": 6,
  "حمد ال مهيم": 7,
  "علي المبيسي": 8,
  "محمد عبدالله محيم": 9,
  "حسام الله الحديدي": 10,
  "هيام محمد هياملي": 11,
  "بدر الثياني": 12,
  "خالد ااماجردي": 13,
  "عبدالله السلمي": 14,
  "فهد الحلباني": 15,
  "محمد نجار": 16,
};

function pid(index: number): string {
  return IDS.notionPlayers[index];
}

// ── Seed Players (18) ──
async function seedNotionPlayers() {
  const players = [
    {
      id: pid(0),
      firstName: "Mohammed",
      lastName: "Al-Shammari",
      firstNameAr: "محمد",
      lastNameAr: "الشمري",
      dateOfBirth: "1994-01-01",
      nationality: "Saudi",
      position: "Goalkeeper",
      contractType: "Professional",
      playerType: "Pro",
      overallGrade: "A",
      notes: "فريق أول",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(1),
      firstName: "Mohammed",
      lastName: "Al-Shammari",
      firstNameAr: "محمد",
      lastNameAr: "الشمري",
      dateOfBirth: "2008-01-01",
      nationality: "Saudi",
      position: "Left Back",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B+",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(2),
      firstName: "Mohammed",
      lastName: "Mujarbi",
      firstNameAr: "محمد",
      lastNameAr: "مجربي",
      dateOfBirth: "2011-01-01",
      nationality: "Saudi",
      position: "Defensive Midfielder",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(3),
      firstName: "Hussam",
      lastName: "Al-Asmari",
      firstNameAr: "حسام",
      lastNameAr: "الاسمري",
      dateOfBirth: "2008-01-01",
      nationality: "Saudi",
      position: "Striker",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B+",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(4),
      firstName: "Zaher",
      lastName: "Asiri",
      firstNameAr: "ظاهر",
      lastNameAr: "عسيري",
      dateOfBirth: "2009-01-01",
      nationality: "Saudi",
      position: "Defensive Midfielder",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B+",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(5),
      firstName: "Hussam",
      lastName: "Bukhari",
      firstNameAr: "حسام",
      lastNameAr: "بخاري",
      dateOfBirth: "2004-01-01",
      nationality: "Saudi",
      position: "Striker",
      contractType: "Professional",
      playerType: "Pro",
      overallGrade: "B+",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(6),
      firstName: "Anas",
      lastName: "Al-Mamili",
      firstNameAr: "ايس",
      lastNameAr: "الماملي",
      dateOfBirth: "2010-01-01",
      nationality: "Saudi",
      position: "Striker",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(7),
      firstName: "Hamad",
      lastName: "Al Muheem",
      firstNameAr: "حمد",
      lastNameAr: "ال مهيم",
      dateOfBirth: "2008-01-01",
      nationality: "Saudi",
      position: "Left Back",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B+",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(8),
      firstName: "Ali",
      lastName: "Al-Mubaisi",
      firstNameAr: "علي",
      lastNameAr: "المبيسي",
      dateOfBirth: "2008-01-01",
      nationality: "Saudi",
      position: "Winger",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B+",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(9),
      firstName: "Mohammed",
      lastName: "Abdullah Muheem",
      firstNameAr: "محمد",
      lastNameAr: "عبدالله محيم",
      dateOfBirth: "2008-01-01",
      nationality: "Yemeni",
      position: "Central Midfielder",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B+",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(10),
      firstName: "Hussam Allah",
      lastName: "Al-Hadidi",
      firstNameAr: "حسام الله",
      lastNameAr: "الحديدي",
      dateOfBirth: "2009-01-01",
      nationality: "Egyptian",
      position: "Center Back",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(11),
      firstName: "Hayam Mohammed",
      lastName: "Hayamili",
      firstNameAr: "هيام محمد",
      lastNameAr: "هياملي",
      dateOfBirth: "2010-01-01",
      nationality: "Saudi",
      position: "Center Back",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(12),
      firstName: "Badr",
      lastName: "Al-Thiyani",
      firstNameAr: "بدر",
      lastNameAr: "الثياني",
      dateOfBirth: "2010-01-01",
      nationality: "Saudi",
      position: "Winger",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(13),
      firstName: "Khaled",
      lastName: "Al-Majradi",
      firstNameAr: "خالد",
      lastNameAr: "ااماجردي",
      dateOfBirth: "2010-01-01",
      nationality: "Saudi",
      position: "Central Midfielder",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(14),
      firstName: "Abdullah",
      lastName: "Al-Sulami",
      firstNameAr: "عبدالله",
      lastNameAr: "السلمي",
      dateOfBirth: "2008-01-01",
      nationality: "Saudi",
      position: "Goalkeeper",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "B",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(15),
      firstName: "Fahd",
      lastName: "Al-Hulbani",
      firstNameAr: "فهد",
      lastNameAr: "الحلباني",
      dateOfBirth: "2008-01-01",
      nationality: "Saudi",
      position: "Goalkeeper",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "A",
      status: "active",
      createdBy: IDS.users.admin,
    },
    {
      id: pid(16),
      firstName: "Mohammed",
      lastName: "Najjar",
      firstNameAr: "محمد",
      lastNameAr: "نجار",
      dateOfBirth: "2008-01-01",
      nationality: "Saudi",
      position: "Striker",
      contractType: "Youth",
      playerType: "Youth",
      overallGrade: "A",
      status: "active",
      createdBy: IDS.users.admin,
    },
  ];

  for (const p of players) {
    await Player.findOrCreate({
      where: { id: p.id },
      defaults: p as any,
    });
  }
  logger.info(`[Notion Seed] Seeded ${players.length} players`);
}

// ── Seed Tickets (6) ──
async function seedNotionTickets() {
  const tickets = [
    {
      id: IDS.notionTickets[0],
      playerId: pid(10), // حسام الله الحديدي
      title: "Improve fitness and header training",
      titleAr: "تمرين على الارتقاء",
      ticketType: "Physical",
      priority: "medium",
      status: "Open",
      receivingParty: "Physical Specialist",
      receivingPartyAr: "أخصائي بدني",
      closureDate: "2026-02-20",
      createdBy: IDS.users.analyst,
    },
    {
      id: IDS.notionTickets[1],
      playerId: pid(10), // حسام الله الحديدي
      title: "Improve final third passes and headers",
      titleAr: "تمرين الكرات النهائية و التعامل الراسيات",
      ticketType: "Physical",
      priority: "urgent",
      status: "Open",
      receivingParty: "Physical Specialist",
      receivingPartyAr: "أخصائي بدني",
      createdBy: IDS.users.analyst,
    },
    {
      id: IDS.notionTickets[2],
      playerId: pid(7), // حمد ال مهيم
      title: "Set piece training",
      titleAr: "تمرين ضربات ثابتة",
      ticketType: "Physical",
      priority: "medium",
      status: "Open",
      receivingParty: "External Coach",
      receivingPartyAr: "مدرب خارجي",
      closureDate: "2026-03-03",
      createdBy: IDS.users.analyst,
    },
    {
      id: IDS.notionTickets[3],
      playerId: pid(13), // خالد ااماجردي
      title: "Recovery report dates",
      titleAr: "تقارير استشفاء",
      ticketType: "Physical",
      priority: "medium",
      status: "Open",
      receivingParty: "Physical Specialist",
      receivingPartyAr: "أخصائي بدني",
      closureDate: "2026-03-14",
      createdBy: IDS.users.analyst,
    },
    {
      id: IDS.notionTickets[4],
      playerId: pid(13), // خالد ااماجردي
      title: "Visual scanning drill for player",
      titleAr: "تمرين مسح بصري للملعب",
      ticketType: "Physical",
      priority: "medium",
      status: "WaitingOnPlayer",
      receivingParty: "Physical Specialist",
      receivingPartyAr: "أخصائي بدني",
      closureDate: "2026-02-20",
      createdBy: IDS.users.analyst,
    },
    {
      id: IDS.notionTickets[5],
      playerId: pid(6), // ايس الماملي
      title: "Increase physical and agility aspects",
      titleAr: "زيادة الجانب البدني و الرشاقة",
      ticketType: "Physical",
      priority: "urgent",
      status: "InProgress",
      receivingParty: "Physical Specialist",
      receivingPartyAr: "أخصائي بدني",
      closureDate: "2026-02-17",
      createdBy: IDS.users.analyst,
    },
  ];

  for (const t of tickets) {
    await Ticket.findOrCreate({
      where: { id: t.id },
      defaults: t as any,
    });
  }
  logger.info(`[Notion Seed] Seeded ${tickets.length} tickets`);
}

// ── Seed Sessions as Referrals (25 performance analysis sessions) ──
async function seedNotionSessions() {
  // Each Notion session maps to a Referral with referralType="Performance"
  interface SessionData {
    id: string;
    playerId: string;
    triggerDesc: string;
    status: "Open" | "Resolved";
    notes?: string;
    resultingTicketId?: string;
  }

  const sessions: SessionData[] = [
    {
      id: IDS.notionSessions[0],
      playerId: pid(7),
      triggerDesc: "تحليل مباراة هجر",
      status: "Resolved",
    },
    {
      id: IDS.notionSessions[1],
      playerId: pid(16),
      triggerDesc: "تحليل مباراة التعاون",
      status: "Resolved",
    },
    {
      id: IDS.notionSessions[2],
      playerId: pid(3),
      triggerDesc: "تحليل مباراة الحزم",
      status: "Resolved",
    },
    {
      id: IDS.notionSessions[3],
      playerId: pid(4),
      triggerDesc: "تحليل مباراة الاخدود",
      status: "Open",
    },
    {
      id: IDS.notionSessions[4],
      playerId: pid(13),
      triggerDesc: "تحليل مباراة الوطن",
      status: "Resolved",
      notes: "مناقشة تأثير لعب المباراناة المترة السابقة",
    },
    {
      id: IDS.notionSessions[5],
      playerId: pid(7),
      triggerDesc: "تحليل مباراة الكلوب",
      status: "Resolved",
    },
    {
      id: IDS.notionSessions[6],
      playerId: pid(10),
      triggerDesc: "تحليل مباراة مجد الملوذة",
      status: "Resolved",
      notes: "نقاش حول اسلوب التعامل مع الكرات العالية",
    },
    {
      id: IDS.notionSessions[7],
      playerId: pid(7),
      triggerDesc: "تحليل مباراة الصفا",
      status: "Resolved",
      notes: "تطور في اختراق العمق الجانبي",
    },
    {
      id: IDS.notionSessions[8],
      playerId: pid(1),
      triggerDesc: "تحليل مباراة التعاون",
      status: "Resolved",
      notes: "اسيست في المباراة",
    },
    {
      id: IDS.notionSessions[9],
      playerId: pid(3),
      triggerDesc: "تحليل مباراة التعاون",
      status: "Resolved",
      notes: "اداء ممتاز و احراز هدفين",
    },
    {
      id: IDS.notionSessions[10],
      playerId: pid(12),
      triggerDesc: "تحليل مباراة الشباب",
      status: "Resolved",
      notes: "اخطاء عدم طلب الكرة",
    },
    {
      id: IDS.notionSessions[11],
      playerId: pid(11),
      triggerDesc: "تحليل مباراة الشباب",
      status: "Resolved",
      notes: "التعامل الارضي ممتاز",
      resultingTicketId: IDS.notionTickets[4], // تمرين مسح بصري
    },
    {
      id: IDS.notionSessions[12],
      playerId: pid(10),
      triggerDesc: "تحليل مباراة الهلال",
      status: "Open",
      notes: "اداء هيم",
    },
    {
      id: IDS.notionSessions[13],
      playerId: pid(3),
      triggerDesc: "تحليل مباراة احد",
      status: "Resolved",
      notes: "احراز هدفين",
    },
    {
      id: IDS.notionSessions[14],
      playerId: pid(1),
      triggerDesc: "تحليل مباراة احد",
      status: "Resolved",
      notes: "اداء جيد",
    },
    {
      id: IDS.notionSessions[15],
      playerId: pid(12),
      triggerDesc: "تحليل مباراة الباطن",
      status: "Resolved",
      notes: "تحسن في القرار",
    },
    {
      id: IDS.notionSessions[16],
      playerId: pid(11),
      triggerDesc: "تحليل مباراة الباطن",
      status: "Resolved",
      notes: "خروج لاصابة",
    },
    {
      id: IDS.notionSessions[17],
      playerId: pid(8),
      triggerDesc: "تحليل مباراة الروضة",
      status: "Resolved",
      notes: "تحسن في اللعب الجماعي",
    },
    {
      id: IDS.notionSessions[18],
      playerId: pid(7),
      triggerDesc: "تحليل مباراة الانصار",
      status: "Open",
      notes: "المباراة غير مسجلة على سام",
    },
    {
      id: IDS.notionSessions[19],
      playerId: pid(13),
      triggerDesc: "تحليل مباراة الرائد",
      status: "Resolved",
      notes: "تحسن في الراسيات و اللعب الجماعي",
    },
    {
      id: IDS.notionSessions[20],
      playerId: pid(3),
      triggerDesc: "تحليل مباراة الاهلي",
      status: "Resolved",
      notes: "مروقيات ممسية",
    },
    {
      id: IDS.notionSessions[21],
      playerId: pid(1),
      triggerDesc: "تحليل مباراة الاهلي",
      status: "Resolved",
      notes: "اداء جيد و زيادي بدنية",
    },
    {
      id: IDS.notionSessions[22],
      playerId: pid(4),
      triggerDesc: "تحليل مباراة الوطن",
      status: "Resolved",
      notes: "اداء في تحسن",
    },
    {
      id: IDS.notionSessions[23],
      playerId: pid(10),
      triggerDesc: "تحليل مباراة العروبة",
      status: "Resolved",
      notes: "تحليل المباراة مع ذكر المزايا و العيوب",
      resultingTicketId: IDS.notionTickets[0], // تمرين على الارتقاء
    },
    {
      id: IDS.notionSessions[24],
      playerId: pid(10),
      triggerDesc: "تحليل مباراة الفتح",
      status: "Resolved",
      notes: "اداء جيد",
    },
  ];

  for (const s of sessions) {
    await Referral.findOrCreate({
      where: { id: s.id },
      defaults: {
        id: s.id,
        referralType: "Performance",
        playerId: s.playerId,
        triggerDesc: s.triggerDesc,
        status: s.status,
        priority: "Medium",
        notes: s.notes ?? null,
        resultingTicketId: s.resultingTicketId ?? null,
        assignedTo: IDS.users.analyst, // محلل أداء
        createdBy: IDS.users.analyst,
        resolvedAt: s.status === "Resolved" ? new Date() : null,
      } as any,
    });
  }
  logger.info(
    `[Notion Seed] Seeded ${sessions.length} sessions (as referrals)`,
  );
}

// ── Seed Journey Stages (2) ──
async function seedNotionJourneys() {
  const journeys = [
    {
      id: IDS.notionJourneys[0],
      playerId: pid(10), // حسام الله الحديدي
      stageName: "Program for handling official headers",
      stageNameAr: "برنامج تعامل مع العرضيات الراسية",
      stageOrder: 0,
      status: "NotStarted",
      health: "OnTrack",
      stageType: "PhysicalTraining",
      startDate: "2026-03-24",
      expectedEndDate: "2026-03-16",
      responsibleParty: "Physical Specialist",
      responsiblePartyAr: "أخصائي بدني",
      createdBy: IDS.users.analyst,
    },
    {
      id: IDS.notionJourneys[1],
      playerId: pid(6), // ايس الماملي
      stageName: "Comprehensive development program",
      stageNameAr: "برنامج تطوير هيم",
      stageOrder: 0,
      status: "InProgress",
      health: "OnTrack",
      stageType: "PhysicalTraining",
      startDate: "2026-02-17",
      expectedEndDate: "2026-03-01",
      responsibleParty: "Performance Analyst",
      responsiblePartyAr: "محلل الأداء",
      createdBy: IDS.users.analyst,
    },
  ];

  for (const j of journeys) {
    await Journey.findOrCreate({
      where: { id: j.id },
      defaults: j as any,
    });
  }
  logger.info(`[Notion Seed] Seeded ${journeys.length} journey stages`);
}

// ── Main entry ──
export async function seedNotionData() {
  logger.info("[Notion Seed] Starting Notion data import...");
  await seedNotionPlayers();
  await seedNotionTickets();
  await seedNotionSessions();
  await seedNotionJourneys();
  logger.info("[Notion Seed] Notion data import complete.");
}
