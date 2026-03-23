// ─────────────────────────────────────────────────────────────
// src/database/seed/users.seed.ts
// ─────────────────────────────────────────────────────────────
import bcrypt from "bcryptjs";
import { User } from "@modules/users/user.model";
import { env } from "@config/env";
import { IDS } from "./ids";

export async function seedUsers() {
  const hash = await bcrypt.hash("Sadara2025!", env.bcrypt.saltRounds);

  await User.bulkCreate(
    [
      {
        id: IDS.users.admin,
        email: "admin@sadara.com",
        passwordHash: hash,
        fullName: "Abdulaziz Al-Rashid",
        fullNameAr: "عبدالعزيز الراشد",
        role: "Admin",
        isActive: true,
      },
      {
        id: IDS.users.agent,
        email: "agent@sadara.com",
        passwordHash: hash,
        fullName: "Faisal Al-Dosari",
        fullNameAr: "فيصل الدوسري",
        role: "Manager",
        isActive: true,
      },
      {
        id: IDS.users.analyst,
        email: "analyst@sadara.com",
        passwordHash: hash,
        fullName: "Nora Al-Otaibi",
        fullNameAr: "نورة العتيبي",
        role: "Analyst",
        isActive: true,
      },
      {
        id: IDS.users.scout,
        email: "scout@sadara.com",
        passwordHash: hash,
        fullName: "Khalid Al-Ghamdi",
        fullNameAr: "خالد الغامدي",
        role: "Scout",
        isActive: true,
      },
      {
        id: IDS.users.player,
        email: "salem@sadara.com",
        passwordHash: hash,
        fullName: "Salem Al-Dawsari",
        fullNameAr: "سالم الدوسري",
        role: "Player",
        isActive: true,
        playerId: IDS.players[0],
      },
      {
        id: IDS.users.legal,
        email: "legal@sadara.com",
        passwordHash: hash,
        fullName: "Sara Al-Harbi",
        fullNameAr: "سارة الحربي",
        role: "Legal",
        isActive: true,
      },
      {
        id: IDS.users.finance,
        email: "finance@sadara.com",
        passwordHash: hash,
        fullName: "Mohammed Al-Shehri",
        fullNameAr: "محمد الشهري",
        role: "Finance",
        isActive: true,
      },
      {
        id: IDS.users.coach,
        email: "coach@sadara.com",
        passwordHash: hash,
        fullName: "Hassan Al-Mutairi",
        fullNameAr: "حسن المطيري",
        role: "Coach",
        isActive: true,
      },
      {
        id: IDS.users.media,
        email: "media@sadara.com",
        passwordHash: hash,
        fullName: "Reem Al-Qahtani",
        fullNameAr: "ريم القحطاني",
        role: "Media",
        isActive: true,
      },
      {
        id: IDS.users.executive,
        email: "executive@sadara.com",
        passwordHash: hash,
        fullName: "Turki Al-Faisal",
        fullNameAr: "تركي الفيصل",
        role: "Executive",
        isActive: true,
      },
      // ── Additional staff for auto-task testing ──
      {
        id: IDS.users.agent2,
        email: "agent2@sadara.com",
        passwordHash: hash,
        fullName: "Salman Al-Subaie",
        fullNameAr: "سلمان السبيعي",
        role: "Manager",
        isActive: true,
      },
      {
        id: IDS.users.coach2,
        email: "coach2@sadara.com",
        passwordHash: hash,
        fullName: "Majed Al-Anazi",
        fullNameAr: "ماجد العنزي",
        role: "Coach",
        isActive: true,
      },
      {
        id: IDS.users.analyst2,
        email: "analyst2@sadara.com",
        passwordHash: hash,
        fullName: "Huda Al-Shamrani",
        fullNameAr: "هدى الشمراني",
        role: "Analyst",
        isActive: true,
      },
      {
        id: IDS.users.scout2,
        email: "scout2@sadara.com",
        passwordHash: hash,
        fullName: "Rashid Al-Dosari",
        fullNameAr: "راشد الدوسري",
        role: "Scout",
        isActive: true,
      },
      {
        id: IDS.users.legal2,
        email: "legal2@sadara.com",
        passwordHash: hash,
        fullName: "Lama Al-Otaibi",
        fullNameAr: "لمى العتيبي",
        role: "Legal",
        isActive: true,
      },
      {
        id: IDS.users.player2,
        email: "yasser@sadara.com",
        passwordHash: hash,
        fullName: "Yasser Al-Shahrani",
        fullNameAr: "ياسر الشهراني",
        role: "Player",
        isActive: true,
        playerId: IDS.players[1],
      },
      {
        id: IDS.users.player3,
        email: "firas@sadara.com",
        passwordHash: hash,
        fullName: "Firas Al-Buraikan",
        fullNameAr: "فراس البريكان",
        role: "Player",
        isActive: true,
        playerId: IDS.players[3],
      },
    ],
    { ignoreDuplicates: true },
  );

  console.log("✅ Users seeded (18 accounts — password: Sadara2025!)");
}
