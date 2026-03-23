// ─────────────────────────────────────────────────────────────
// src/database/autoTaskSeed.ts
// Seed data designed to trigger all 28 auto-task rules.
//
// This seeds "trigger-ready" records — contracts in Draft,
// offers approaching deadline, overdue injuries, expiring
// documents, etc. Run cron jobs or hit service endpoints
// to see auto-tasks get created.
// ─────────────────────────────────────────────────────────────

import { Contract } from "@modules/contracts/contract.model";
import { Offer } from "@modules/offers/offer.model";
import { Injury } from "@modules/injuries/injury.model";
import { InjuryUpdate } from "@modules/injuries/injury.model";
import { Referral } from "@modules/referrals/referral.model";
import { Document } from "@modules/documents/document.model";
import { ApprovalRequest } from "@modules/approvals/approval.model";
import { ApprovalStep } from "@modules/approvals/approvalStep.model";
import {
  TrainingCourse,
  TrainingEnrollment,
} from "@modules/training/training.model";
import { IDS } from "./ids";

// ── Helpers ──

/** Relative date from today (negative = past, positive = future) */
function relDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

// ─────────────────────────────────────────────────────────────
// 1–4. CONTRACT AUTO-TASKS
//
//  #1  contract_legal_review     — new contract created → Legal
//  #2  contract_submit_review    — status = Review → Legal
//  #3  contract_get_signatures   — status = Signing → Manager
//  #4  contract_player_followup  — status = AwaitingPlayer → Agent
//
// These are real-time triggers (fired in contract.service.ts).
// Seed contracts in the right statuses so testers can
// transition them via the API to fire the hooks.
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskContracts() {
  await Contract.bulkCreate(
    [
      {
        // #1 — Draft contract ready to be created (already exists = simulates "just created")
        id: IDS.seedContracts[0],
        playerId: IDS.players[2],
        clubId: IDS.clubs.alAhli,
        contractType: "Representation" as any,
        status: "Draft" as any,
        title: "[TEST] Draft contract for legal review",
        startDate: relDate(0),
        endDate: relDate(365),
        baseSalary: 1500000,
        commissionPct: 10,
        createdBy: IDS.users.agent,
      },
      {
        // #2 — Contract in Review → triggers legal review task
        id: IDS.seedContracts[1],
        playerId: IDS.players[4],
        clubId: IDS.clubs.alNassr,
        contractType: "Transfer" as any,
        status: "Review" as any,
        title: "[TEST] Contract in Review status",
        startDate: relDate(-30),
        endDate: relDate(335),
        baseSalary: 2000000,
        commissionPct: 8,
        createdBy: IDS.users.agent,
      },
      {
        // #3 — Contract in Signing → triggers get-signatures task
        id: IDS.seedContracts[2],
        playerId: IDS.players[15], // Abdulaziz Al-Bishi (agent2's player)
        clubId: IDS.clubs.alNassr,
        contractType: "Renewal" as any,
        status: "Signing" as any,
        title: "[TEST] Contract awaiting signatures",
        startDate: relDate(-15),
        endDate: relDate(350),
        baseSalary: 1800000,
        commissionPct: 12,
        createdBy: IDS.users.agent2,
      },
      {
        // #4 — Contract AwaitingPlayer → triggers player follow-up task
        id: IDS.seedContracts[3],
        playerId: IDS.players[16], // Khalid Al-Ghannam (agent2's player)
        clubId: IDS.clubs.alIttihad,
        contractType: "Representation" as any,
        status: "AwaitingPlayer" as any,
        title: "[TEST] Contract awaiting player response",
        startDate: relDate(-7),
        endDate: relDate(358),
        baseSalary: 1200000,
        commissionPct: 10,
        createdBy: IDS.users.agent2,
      },
    ],
    { ignoreDuplicates: true },
  );

  console.log("✅ Auto-task contracts seeded (4)");
}

// ─────────────────────────────────────────────────────────────
// 8–11. OFFER AUTO-TASKS
//
//  #8  offer_deadline_approaching — deadline in 3 days → Manager
//  #9  offer_negotiation_stale    — Negotiation >14 days → Manager
//  #10 offer_new_review           — new offer → Manager (real-time)
//  #11 offer_accepted_convert     — Accepted → Legal (real-time)
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskOffers() {
  await Offer.bulkCreate(
    [
      {
        // #8 — Deadline in 2 days (will trigger "approaching" cron)
        id: IDS.seedOffers[0],
        playerId: IDS.players[1],
        fromClubId: IDS.clubs.alHilal,
        toClubId: IDS.clubs.alNassr,
        offerType: "Transfer" as any,
        status: "Under Review" as any,
        transferFee: 10000000,
        salaryOffered: 1500000,
        contractYears: 3,
        feeCurrency: "SAR",
        deadline: relDate(2),
        createdBy: IDS.users.agent,
      },
      {
        // #9 — In Negotiation for 20 days (stale)
        id: IDS.seedOffers[1],
        playerId: IDS.players[15], // Abdulaziz (agent2's player)
        fromClubId: IDS.clubs.alAhli,
        toClubId: IDS.clubs.alIttihad,
        offerType: "Transfer" as any,
        status: "Negotiation" as any,
        transferFee: 8000000,
        salaryOffered: 1200000,
        contractYears: 2,
        feeCurrency: "SAR",
        deadline: relDate(30),
        submittedAt: new Date(Date.now() - 20 * 86400000), // 20 days ago
        createdBy: IDS.users.agent2,
      },
      {
        // #10 — New offer (simulates just-created for review)
        id: IDS.seedOffers[2],
        playerId: IDS.players[6],
        fromClubId: IDS.clubs.alShabab,
        toClubId: IDS.clubs.alHilal,
        offerType: "Transfer" as any,
        status: "New" as any,
        transferFee: 5000000,
        salaryOffered: 800000,
        contractYears: 2,
        feeCurrency: "SAR",
        deadline: relDate(14),
        createdBy: IDS.users.agent,
      },
      {
        // #11 — Accepted offer (triggers conversion task)
        id: IDS.seedOffers[3],
        playerId: IDS.players[8],
        fromClubId: IDS.clubs.alNassr,
        toClubId: IDS.clubs.alAhli,
        offerType: "Transfer" as any,
        status: "Accepted" as any,
        transferFee: 12000000,
        salaryOffered: 2000000,
        contractYears: 4,
        feeCurrency: "SAR",
        deadline: relDate(7),
        createdBy: IDS.users.agent,
      },
    ],
    { ignoreDuplicates: true },
  );

  console.log("✅ Auto-task offers seeded (4)");
}

// ─────────────────────────────────────────────────────────────
// 12–14. INJURY AUTO-TASKS
//
//  #12 injury_new_critical       — Critical/Severe injury → Coach+Manager (real-time)
//  #13 injury_return_overdue     — expectedReturnDate passed, still UnderTreatment
//  #14 injury_treatment_stale    — No InjuryUpdate in 14 days
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskInjuries() {
  await Injury.bulkCreate(
    [
      {
        // #12 — Critical injury (triggers real-time task on creation)
        id: IDS.seedInjuries[0],
        playerId: IDS.players[0],
        injuryType: "ACL Tear",
        injuryTypeAr: "تمزق الرباط الصليبي",
        bodyPart: "Knee",
        bodyPartAr: "الركبة",
        severity: "Critical" as any,
        cause: "Match" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-2),
        expectedReturnDate: relDate(180),
        isSurgeryRequired: true,
        createdBy: IDS.users.coach,
      },
      {
        // #13 — Return overdue: expected return was 5 days ago, still UnderTreatment
        id: IDS.seedInjuries[1],
        playerId: IDS.players[2],
        injuryType: "Hamstring Strain",
        injuryTypeAr: "إصابة في أوتار الركبة",
        bodyPart: "Thigh",
        bodyPartAr: "الفخذ",
        severity: "Moderate" as any,
        cause: "Training" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-30),
        expectedReturnDate: relDate(-5),
        createdBy: IDS.users.coach,
      },
      {
        // #14 — Treatment stale: no update in 20 days
        id: IDS.seedInjuries[2],
        playerId: IDS.players[16], // Khalid (coach2's player)
        injuryType: "Ankle Sprain",
        injuryTypeAr: "التواء الكاحل",
        bodyPart: "Ankle",
        bodyPartAr: "الكاحل",
        severity: "Moderate" as any,
        cause: "Match" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-25),
        expectedReturnDate: relDate(10),
        createdBy: IDS.users.coach2,
      },
      {
        // #12 — Severe injury (also triggers critical task)
        id: IDS.seedInjuries[3],
        playerId: IDS.players[9],
        injuryType: "Meniscus Tear",
        injuryTypeAr: "تمزق الغضروف الهلالي",
        bodyPart: "Knee",
        bodyPartAr: "الركبة",
        severity: "Severe" as any,
        cause: "Match" as any,
        status: "UnderTreatment" as any,
        injuryDate: relDate(-1),
        expectedReturnDate: relDate(90),
        isSurgeryRequired: true,
        surgeryDate: relDate(3),
        createdBy: IDS.users.coach,
      },
    ],
    { ignoreDuplicates: true },
  );

  // Add an old InjuryUpdate for injury #14 to make it "stale" (last update 20 days ago)
  try {
    await InjuryUpdate.bulkCreate(
      [
        {
          injuryId: IDS.seedInjuries[2],
          updateDate: relDate(-20),
          status: "UnderTreatment" as any,
          notes: "Patient doing physiotherapy, slow progress",
          updatedBy: IDS.users.coach,
        },
      ],
      { ignoreDuplicates: true },
    );
  } catch {
    // InjuryUpdate may not exist yet
  }

  console.log("✅ Auto-task injuries seeded (4)");
}

// ─────────────────────────────────────────────────────────────
// 19. TRAINING AUTO-TASKS
//
//  #19 training_course_completed   — enrollment → Completed
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskTraining() {
  // #19 — Training course completed
  await TrainingCourse.bulkCreate(
    [
      {
        id: IDS.seedTrainingCourses[0],
        title: "[TEST] Tactical Awareness Fundamentals",
        titleAr: "أساسيات الوعي التكتيكي",
        contentType: "Video" as any,
        difficulty: "Intermediate" as any,
        durationHours: 8,
        isActive: true,
        createdBy: IDS.users.coach,
      },
      {
        id: IDS.seedTrainingCourses[1],
        title: "[TEST] Fitness Recovery Protocols",
        titleAr: "بروتوكولات استعادة اللياقة",
        contentType: "PDF" as any,
        difficulty: "Beginner" as any,
        durationHours: 4,
        isActive: true,
        createdBy: IDS.users.coach,
      },
    ],
    { ignoreDuplicates: true },
  );

  await TrainingEnrollment.bulkCreate(
    [
      {
        // Recently completed — triggers course-completed task
        id: IDS.seedTrainingEnrollments[0],
        courseId: IDS.seedTrainingCourses[0],
        playerId: IDS.players[2],
        status: "Completed" as any,
        progressPct: 100,
        completedAt: new Date(Date.now() - 2 * 86400000), // 2 days ago
        assignedBy: IDS.users.coach,
      },
      {
        // Still in progress (control)
        id: IDS.seedTrainingEnrollments[1],
        courseId: IDS.seedTrainingCourses[1],
        playerId: IDS.players[5],
        status: "InProgress" as any,
        progressPct: 45,
        assignedBy: IDS.users.coach,
      },
    ],
    { ignoreDuplicates: true },
  );

  console.log("✅ Auto-task training seeded (2 courses, 2 enrollments)");
}

// ─────────────────────────────────────────────────────────────
// 20–21. APPROVAL AUTO-TASKS
//
//  #20 approval_step_overdue  — Active step past dueDate
//  #21 approval_rejected_action — Request rejected → creator
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskApprovals() {
  await ApprovalRequest.bulkCreate(
    [
      {
        // #20 — Pending approval with overdue step
        id: IDS.seedApprovals[0],
        entityType: "contract",
        entityId: IDS.seedContracts[0],
        entityTitle: "[TEST] Contract approval - overdue step",
        action: "approve_contract",
        status: "Pending" as any,
        priority: "high",
        requestedBy: IDS.users.agent,
        assignedTo: IDS.users.legal,
        assignedRole: "Legal",
        currentStep: 1,
        totalSteps: 2,
        dueDate: relDate(-3),
      },
      {
        // #21 — Rejected approval → creator should get a task
        id: IDS.seedApprovals[1],
        entityType: "offer",
        entityId: IDS.seedOffers[2],
        entityTitle: "[TEST] Offer approval - rejected",
        action: "approve_offer",
        status: "Rejected" as any,
        priority: "normal",
        requestedBy: IDS.users.agent,
        assignedTo: IDS.users.admin,
        assignedRole: "Admin",
        currentStep: 1,
        totalSteps: 1,
        dueDate: relDate(-1),
        resolvedBy: IDS.users.admin,
        resolvedAt: new Date(Date.now() - 86400000),
      },
    ],
    { ignoreDuplicates: true },
  );

  // Approval steps
  await ApprovalStep.bulkCreate(
    [
      {
        // Overdue active step (for approval #20)
        id: IDS.seedApprovalSteps[0],
        approvalRequestId: IDS.seedApprovals[0],
        stepNumber: 1,
        approverRole: "Legal",
        approverUserId: IDS.users.legal,
        status: "Active",
        label: "Legal Review",
        labelAr: "مراجعة قانونية",
        dueDate: relDate(-3), // 3 days overdue
      },
      {
        // Pending second step (for approval #20)
        id: IDS.seedApprovalSteps[1],
        approvalRequestId: IDS.seedApprovals[0],
        stepNumber: 2,
        approverRole: "Manager",
        status: "Pending",
        label: "Manager Sign-off",
        labelAr: "موافقة المدير",
        dueDate: relDate(3),
      },
      {
        // Rejected step (for approval #21)
        id: IDS.seedApprovalSteps[2],
        approvalRequestId: IDS.seedApprovals[1],
        stepNumber: 1,
        approverRole: "Admin",
        approverUserId: IDS.users.admin,
        status: "Rejected",
        label: "Admin Approval",
        labelAr: "موافقة المشرف",
        comment: "Offer terms not acceptable",
        dueDate: relDate(-1),
        resolvedBy: IDS.users.admin,
        resolvedAt: new Date(Date.now() - 86400000),
      },
    ],
    { ignoreDuplicates: true },
  );

  console.log("✅ Auto-task approvals seeded (2 requests + 3 steps)");
}

// ─────────────────────────────────────────────────────────────
// 22–24. DOCUMENT AUTO-TASKS
//
//  #22 document_expiry_30d          — expiring in 30 days → Agent
//  #23 document_expiry_7d           — expiring in 7 days → Agent+Manager
//  #24 player_missing_documents     — player missing Passport/Medical/ID
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskDocuments() {
  await Document.bulkCreate(
    [
      {
        // #22 — Passport expiring in 25 days (within 30-day window)
        id: IDS.seedDocuments[0],
        entityType: "Player" as any,
        entityId: IDS.players[3],
        entityLabel: "Firas Al-Buraikan",
        name: "[TEST] Firas - Passport (expiring soon)",
        type: "Passport" as any,
        status: "Valid" as any,
        fileUrl: "/uploads/docs/test-passport-expiring.pdf",
        fileSize: 2048000,
        mimeType: "application/pdf",
        issueDate: relDate(-335),
        expiryDate: relDate(25),
        uploadedBy: IDS.users.agent,
      },
      {
        // #23 — Medical report expiring in 5 days (within 7-day window)
        id: IDS.seedDocuments[1],
        entityType: "Player" as any,
        entityId: IDS.players[5],
        entityLabel: "Mohammed Al-Burayk",
        name: "[TEST] Mohammed - Medical (expiring in 5 days)",
        type: "Medical" as any,
        status: "Valid" as any,
        fileUrl: "/uploads/docs/test-medical-expiring.pdf",
        fileSize: 1536000,
        mimeType: "application/pdf",
        issueDate: relDate(-360),
        expiryDate: relDate(5),
        uploadedBy: IDS.users.agent,
      },
      {
        // #23 — ID expiring in 3 days (critical)
        id: IDS.seedDocuments[2],
        entityType: "Player" as any,
        entityId: IDS.players[7],
        entityLabel: "Sultan Al-Ghannam",
        name: "[TEST] Sultan - National ID (expiring in 3 days)",
        type: "ID" as any,
        status: "Valid" as any,
        fileUrl: "/uploads/docs/test-id-expiring.pdf",
        fileSize: 1024000,
        mimeType: "application/pdf",
        issueDate: relDate(-362),
        expiryDate: relDate(3),
        uploadedBy: IDS.users.agent,
      },
      {
        // Control — document not expiring soon
        id: IDS.seedDocuments[3],
        entityType: "Player" as any,
        entityId: IDS.players[0],
        entityLabel: "Salem Al-Dawsari",
        name: "[TEST] Salem - Agreement (valid)",
        type: "Agreement" as any,
        status: "Active" as any,
        fileUrl: "/uploads/docs/test-agreement-valid.pdf",
        fileSize: 3072000,
        mimeType: "application/pdf",
        expiryDate: relDate(365),
        uploadedBy: IDS.users.agent,
      },
      {
        // Already expired document
        id: IDS.seedDocuments[4],
        entityType: "Player" as any,
        entityId: IDS.players[8],
        entityLabel: "Abdulrahman Ghareeb",
        name: "[TEST] Abdulrahman - Expired Passport",
        type: "Passport" as any,
        status: "Expired" as any,
        fileUrl: "/uploads/docs/test-passport-expired.pdf",
        fileSize: 2048000,
        mimeType: "application/pdf",
        expiryDate: relDate(-10),
        uploadedBy: IDS.users.agent,
      },
      {
        // #24 — Player[9] will have NO passport, medical, or ID docs
        // This document is an Agreement (not one of the required types)
        id: IDS.seedDocuments[5],
        entityType: "Player" as any,
        entityId: IDS.players[9],
        entityLabel: "Ali Al-Hassan",
        name: "[TEST] Ali - Sponsorship Agreement only",
        type: "Agreement" as any,
        status: "Active" as any,
        fileUrl: "/uploads/docs/test-agreement-only.pdf",
        fileSize: 1024000,
        mimeType: "application/pdf",
        expiryDate: relDate(200),
        uploadedBy: IDS.users.agent,
      },
    ],
    { ignoreDuplicates: true },
  );

  console.log("✅ Auto-task documents seeded (6)");
}

// ─────────────────────────────────────────────────────────────
// 25–26. REFERRAL AUTO-TASKS
//
//  #25 referral_critical_created — Critical referral → Manager (real-time)
//  #26 referral_overdue          — Open/InProgress past dueDate
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskReferrals() {
  await Referral.bulkCreate(
    [
      {
        // #25 — Critical referral (triggers real-time task)
        id: IDS.seedReferrals[0],
        referralType: "Medical" as any,
        playerId: IDS.players[0],
        triggerDesc:
          "[TEST] Critical knee injury requiring immediate specialist referral",
        status: "Open" as any,
        priority: "Critical" as any,
        assignedTo: IDS.users.analyst,
        dueDate: relDate(3),
        createdBy: IDS.users.coach,
      },
      {
        // #26 — Overdue referral (Open, past due date)
        id: IDS.seedReferrals[1],
        referralType: "Performance" as any,
        playerId: IDS.players[16], // Khalid (coach2/analyst2's player)
        triggerDesc: "[TEST] Declining performance — needs coaching review",
        status: "Open" as any,
        priority: "High" as any,
        assignedTo: IDS.users.analyst2,
        dueDate: relDate(-5), // 5 days overdue
        createdBy: IDS.users.agent2,
      },
      {
        // #26 — Overdue referral (InProgress, past due date)
        id: IDS.seedReferrals[2],
        referralType: "Mental" as any,
        playerId: IDS.players[17], // Saad Al-Shehri
        triggerDesc: "[TEST] Anxiety management — follow-up overdue",
        status: "InProgress" as any,
        priority: "Medium" as any,
        assignedTo: IDS.users.coach2,
        dueDate: relDate(-3), // 3 days overdue
        isRestricted: true,
        createdBy: IDS.users.agent,
      },
    ],
    { ignoreDuplicates: true },
  );

  console.log("✅ Auto-task referrals seeded (3)");
}

// ─────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────
export async function seedAutoTaskTestData() {
  console.log("\n🔧 Seeding auto-task test data...");

  await seedAutoTaskContracts();
  await seedAutoTaskOffers();
  await seedAutoTaskInjuries();
  await seedAutoTaskTraining();
  await seedAutoTaskApprovals();
  await seedAutoTaskDocuments();
  await seedAutoTaskReferrals();

  console.log("🎯 Auto-task test data complete!");
  console.log("");
  console.log("   To trigger CRON-based auto-tasks:");
  console.log("     GET /api/v1/cron/test/all");
  console.log("");
  console.log("   To trigger REAL-TIME auto-tasks:");
  console.log("     • Create a new contract → legal review task (#1)");
  console.log(
    "     • Transition contract to Review/Signing/AwaitingPlayer (#2-4)",
  );
  console.log("     • Create a new offer → manager review (#10)");
  console.log("     • Accept an offer → conversion task (#11)");
  console.log("     • Create a Critical injury → coach+manager alert (#12)");
  console.log("     • Reject an approval → creator task (#21)");
  console.log("     • Create a Critical referral → manager task (#25)");
  console.log("     • Complete a gate → next-gate task (#27)");
  console.log("     • Generate a report that fails → creator task (#28)");
  console.log("");
}
