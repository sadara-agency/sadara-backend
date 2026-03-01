
import { Offer } from './../modules/offers/offer.model';
import { Task } from './../modules/tasks/task.model';
import { Invoice, Payment, Valuation } from './../modules/finance/finance.model';
import { Document } from './../modules/documents/document.model';
import { Gate, GateChecklist } from './../modules/gates/gate.model';
import { Referral } from './../modules/referrals/referral.model';
import { Watchlist } from './../modules/scouting/scouting.model';
import { IDS } from './ids';

// ── Offers ──
export async function seedOffers() {
    const data = [
        { pid: 0, from: 'alNassr',  to: 'alHilal',  fee: 15000000, status: 'Under Review', type: 'Transfer' },
        { pid: 3, from: 'alIttihad',to: 'alAhli',   fee: 12000000, status: 'Negotiation',  type: 'Transfer' },
        { pid: 6, from: 'alHilal',  to: 'alShabab',  fee: 4000000,  status: 'New',           type: 'Transfer' },
        { pid: 8, from: 'alAhli',   to: 'alNassr',   fee: 0,        status: 'New',           type: 'Loan' },
        { pid: 4, from: 'alNassr',  to: 'alHilal',  fee: 8000000,  status: 'Closed',        type: 'Transfer' },
    ];

    await Offer.bulkCreate(data.map((o, i) => ({
        id: IDS.offers[i],
        playerId: IDS.players[o.pid],
        fromClubId: (IDS.clubs as any)[o.from], toClubId: (IDS.clubs as any)[o.to],
        offerType: o.type as any, status: o.status as any,
        transferFee: o.fee, salaryOffered: Math.round(o.fee * 0.15),
        contractYears: 3, feeCurrency: 'SAR', deadline: '2026-04-30',
        createdBy: IDS.users.agent,
    })), { ignoreDuplicates: true });

    console.log('✅ Offers seeded (5)');
}

// ── Tasks ──
export async function seedTasks() {
    const data = [
        { title: 'Renew Salem Al-Dawsari contract',              titleAr: 'تجديد عقد سالم الدوسري',           type: 'Contract', priority: 'critical', status: 'Open',       pid: 0,    due: '2026-03-15' },
        { title: 'Medical checkup for Yasser Al-Shahrani',       titleAr: 'فحص طبي ياسر الشهراني',            type: 'Health',   priority: 'high',     status: 'InProgress', pid: 1,    due: '2026-03-10' },
        { title: 'Scouting report: Al Ahli midfield',            titleAr: 'تقرير استكشاف: وسط الأهلي',        type: 'Report',   priority: 'medium',   status: 'Open',       pid: null, due: '2026-03-20' },
        { title: 'Follow up on Al Nassr offer',                  titleAr: 'متابعة عرض النصر',                  type: 'Offer',    priority: 'high',     status: 'Open',       pid: 0,    due: '2026-03-05' },
        { title: 'Prepare Firas Al-Buraikan highlight reel',     titleAr: 'إعداد فيديو فراس البريكان',        type: 'General',  priority: 'medium',   status: 'Completed', pid: 3,    due: '2026-02-28' },
        { title: 'Match preparation: Al Hilal vs Al Nassr',      titleAr: 'تحضير مباراة: الهلال ضد النصر',     type: 'Match',    priority: 'high',     status: 'Open',       pid: null, due: '2026-03-04' },
        { title: 'Commission payment follow-up',                 titleAr: 'متابعة دفع العمولة',                type: 'General',  priority: 'medium',   status: 'Open',       pid: null, due: '2026-03-25' },
        { title: 'Youth player evaluation: Musab',               titleAr: 'تقييم لاعب شاب: مصعب',              type: 'Report',   priority: 'low',      status: 'Open',       pid: 10,   due: '2026-04-01' },
    ];

    await Task.bulkCreate(data.map((t, i) => ({
        id: IDS.tasks[i],
        title: t.title, titleAr: t.titleAr,
        type: t.type as any, priority: t.priority as any, status: t.status as any,
        playerId: t.pid !== null ? IDS.players[t.pid] : null,
        assignedTo: IDS.users.agent, assignedBy: IDS.users.admin, dueDate: t.due,
    })), { ignoreDuplicates: true });

    console.log('✅ Tasks seeded (8)');
}

// ── Finance ──
export async function seedFinance() {
    await Invoice.bulkCreate([
        { id: IDS.invoices[0], invoiceNumber: 'INV-2026-0001', playerId: IDS.players[0], clubId: IDS.clubs.alHilal, amount: 250000, taxAmount: 37500, totalAmount: 287500, currency: 'SAR', status: 'Paid' as any,     issueDate: '2025-12-01', dueDate: '2026-01-01', paidDate: '2025-12-28', description: 'Commission payment', createdBy: IDS.users.admin },
        { id: IDS.invoices[1], invoiceNumber: 'INV-2026-0002', playerId: IDS.players[2], clubId: IDS.clubs.alAhli,  amount: 180000, taxAmount: 27000, totalAmount: 207000, currency: 'SAR', status: 'Expected' as any, issueDate: '2026-02-01', dueDate: '2026-03-01', paidDate: null,         description: 'Commission payment', createdBy: IDS.users.admin },
        { id: IDS.invoices[2], invoiceNumber: 'INV-2026-0003', playerId: IDS.players[3], clubId: IDS.clubs.alAhli,  amount: 220000, taxAmount: 33000, totalAmount: 253000, currency: 'SAR', status: 'Overdue' as any,  issueDate: '2025-11-01', dueDate: '2025-12-01', paidDate: null,         description: 'Commission payment', createdBy: IDS.users.admin },
        { id: IDS.invoices[3], invoiceNumber: 'INV-2026-0004', playerId: IDS.players[9], clubId: IDS.clubs.alHilal, amount: 170000, taxAmount: 25500, totalAmount: 195500, currency: 'SAR', status: 'Paid' as any,     issueDate: '2026-01-15', dueDate: '2026-02-15', paidDate: '2026-02-10', description: 'Commission payment', createdBy: IDS.users.admin },
    ], { ignoreDuplicates: true });

    await Payment.bulkCreate([
        { id: IDS.payments[0], invoiceId: IDS.invoices[0], playerId: IDS.players[0], amount: 250000, currency: 'SAR', paymentType: 'Commission' as any, status: 'Paid' as any,     dueDate: '2026-01-01', paidDate: '2025-12-28' },
        { id: IDS.payments[1], invoiceId: IDS.invoices[1], playerId: IDS.players[0], amount: 50000,  currency: 'SAR', paymentType: 'Bonus' as any,      status: 'Paid' as any,     dueDate: '2025-12-15', paidDate: '2025-12-15' },
        { id: IDS.payments[2], invoiceId: IDS.invoices[2], playerId: IDS.players[9], amount: 170000, currency: 'SAR', paymentType: 'Commission' as any, status: 'Paid' as any,     dueDate: '2026-02-15', paidDate: '2026-02-10' },
        { id: IDS.payments[3], invoiceId: IDS.invoices[3], playerId: IDS.players[2], amount: 180000, currency: 'SAR', paymentType: 'Commission' as any, status: 'Expected' as any, dueDate: '2026-03-01', paidDate: null },
        { id: IDS.payments[4], invoiceId: null,             playerId: IDS.players[3], amount: 220000, currency: 'SAR', paymentType: 'Commission' as any, status: 'Overdue' as any,  dueDate: '2025-12-01', paidDate: null },
        { id: IDS.payments[5], invoiceId: null,             playerId: IDS.players[6], amount: 135000, currency: 'SAR', paymentType: 'Commission' as any, status: 'Paid' as any,     dueDate: '2026-01-15', paidDate: '2026-01-14' },
    ], { ignoreDuplicates: true });

    const trends = ['up','stable','up','up','stable','down','stable','down','up','stable'] as const;
    const values = [12e6, 8e6, 7e6, 9.5e6, 6.5e6, 5.5e6, 3.5e6, 4e6, 3e6, 7.5e6];
    await Valuation.bulkCreate(IDS.players.slice(0, 10).map((pid, i) => ({
        playerId: pid, value: values[i], currency: 'SAR', source: 'Internal Assessment', trend: trends[i], valuedAt: '2026-02-01',
    })), { ignoreDuplicates: true });

    console.log('✅ Finance seeded (4 invoices, 6 payments, 10 valuations)');
}

// ── Documents ──
export async function seedDocuments() {
    const docs = [
        { pid: 0,  name: 'Salem Al-Dawsari - Passport',                type: 'Passport',  status: 'Valid',   expiry: '2029-05-15' },
        { pid: 0,  name: 'Salem Al-Dawsari - Representation Contract', type: 'Contract',  status: 'Active',  expiry: '2027-06-30' },
        { pid: 3,  name: 'Firas Al-Buraikan - Medical Report',         type: 'Medical',   status: 'Active',  expiry: '2026-06-30' },
        { pid: 1,  name: 'Yasser Al-Shahrani - National ID',           type: 'ID',        status: 'Valid',   expiry: '2030-01-01' },
        { pid: 10, name: 'Musab Al-Juwayr - Youth Academy Agreement',  type: 'Agreement', status: 'Pending', expiry: '2029-12-31' },
    ];

    await Document.bulkCreate(docs.map((d, i) => ({
        id: IDS.documents[i], playerId: IDS.players[d.pid],
        name: d.name, type: d.type as any, status: d.status as any,
        fileUrl: `/uploads/docs/${d.type.toLowerCase()}-${i + 1}.pdf`,
        fileSize: 1024000 + Math.floor(Math.random() * 5000000),
        mimeType: 'application/pdf', expiryDate: d.expiry,
        uploadedBy: IDS.users.admin,
    })), { ignoreDuplicates: true });

    console.log('✅ Documents seeded (5)');
}

// ── Gates ──
export async function seedGates() {
    await Gate.bulkCreate([
        { id: IDS.gates[0], playerId: IDS.players[0],  gateNumber: '0' as any, status: 'Passed' as any,     approvedBy: IDS.users.admin },
        { id: IDS.gates[1], playerId: IDS.players[0],  gateNumber: '1' as any, status: 'Passed' as any,     approvedBy: IDS.users.admin },
        { id: IDS.gates[2], playerId: IDS.players[0],  gateNumber: '2' as any, status: 'InProgress' as any, approvedBy: null },
        { id: IDS.gates[3], playerId: IDS.players[10], gateNumber: '0' as any, status: 'Completed' as any,  approvedBy: null },
    ], { ignoreDuplicates: true });

    await GateChecklist.bulkCreate([
        // Gate 0 — Salem (all done)
        { gateId: IDS.gates[0], item: 'Collect player identification documents (ID / Passport)', isCompleted: true,  isMandatory: true,  sortOrder: 1 },
        { gateId: IDS.gates[0], item: 'Obtain signed representation agreement',                  isCompleted: true,  isMandatory: true,  sortOrder: 2 },
        { gateId: IDS.gates[0], item: 'Complete medical examination',                             isCompleted: true,  isMandatory: true,  sortOrder: 3 },
        { gateId: IDS.gates[0], item: 'Upload player photo & profile data',                      isCompleted: true,  isMandatory: false, sortOrder: 4 },
        // Gate 1 — Salem (all done)
        { gateId: IDS.gates[1], item: 'Complete initial performance assessment',                  isCompleted: true,  isMandatory: true,  sortOrder: 1 },
        { gateId: IDS.gates[1], item: 'Create Individual Development Plan (IDP)',                 isCompleted: true,  isMandatory: true,  sortOrder: 2 },
        { gateId: IDS.gates[1], item: 'Set short-term performance goals',                        isCompleted: true,  isMandatory: true,  sortOrder: 3 },
        { gateId: IDS.gates[1], item: 'Record baseline statistics',                              isCompleted: true,  isMandatory: false, sortOrder: 4 },
        // Gate 2 — Salem (2/4 done)
        { gateId: IDS.gates[2], item: 'Mid-season performance review',                           isCompleted: true,  isMandatory: true,  sortOrder: 1 },
        { gateId: IDS.gates[2], item: 'Update market valuation',                                 isCompleted: true,  isMandatory: true,  sortOrder: 2 },
        { gateId: IDS.gates[2], item: 'Review IDP progress & adjust goals',                      isCompleted: false, isMandatory: true,  sortOrder: 3 },
        { gateId: IDS.gates[2], item: 'Stakeholder feedback report',                             isCompleted: false, isMandatory: false, sortOrder: 4 },
        // Gate 0 — Youth
        { gateId: IDS.gates[3], item: 'Identity verification',                                   isCompleted: true,  isMandatory: true,  sortOrder: 1 },
        { gateId: IDS.gates[3], item: 'Medical clearance',                                       isCompleted: true,  isMandatory: true,  sortOrder: 2 },
    ], { ignoreDuplicates: true });

    console.log('✅ Gates seeded (4 gates + 14 checklist items)');
}

// ── Referrals ──
export async function seedReferrals() {
    await Referral.bulkCreate([
        { id: IDS.referrals[0], referralType: 'Medical' as any,     playerId: IDS.players[1], triggerDesc: 'Recurring knee pain after training',            status: 'Open' as any,       priority: 'High' as any,   assignedTo: IDS.users.analyst, createdBy: IDS.users.agent },
        { id: IDS.referrals[1], referralType: 'Performance' as any, playerId: IDS.players[6], triggerDesc: 'Declining match performance over 3 games',      status: 'InProgress' as any, priority: 'Medium' as any, assignedTo: IDS.users.analyst, createdBy: IDS.users.agent },
        { id: IDS.referrals[2], referralType: 'Mental' as any,      playerId: IDS.players[3], triggerDesc: 'Post-match anxiety, resolved with counseling',  status: 'Resolved' as any,   priority: 'Low' as any,    assignedTo: IDS.users.analyst, createdBy: IDS.users.agent },
    ], { ignoreDuplicates: true });

    console.log('✅ Referrals seeded (3)');
}

// ── Scouting ──
export async function seedScouting() {
    const data = [
        { name: 'Ahmed Al-Zahrani', nameAr: 'أحمد الزهراني', dob: '2005-04-12', pos: 'CM', club: 'Al Batin',   prio: 'High',   tech: 78, phys: 82, mental: 75, pot: 85 },
        { name: 'Saad Al-Otaibi',   nameAr: 'سعد العتيبي',   dob: '2006-09-05', pos: 'ST', club: 'Al Wehda',   prio: 'Medium', tech: 72, phys: 80, mental: 70, pot: 80 },
        { name: 'Majed Al-Harbi',   nameAr: 'ماجد الحربي',   dob: '2005-01-22', pos: 'LB', club: 'Al Khaleej', prio: 'High',   tech: 70, phys: 85, mental: 72, pot: 82 },
    ];

    await Watchlist.bulkCreate(data.map((p, i) => ({
        id: IDS.watchlists[i],
        prospectName: p.name, prospectNameAr: p.nameAr,
        dateOfBirth: p.dob, nationality: 'Saudi Arabia',
        position: p.pos, currentClub: p.club, currentLeague: 'Saudi First Division',
        status: 'Active' as const, source: 'Scout Network',
        scoutedBy: IDS.users.scout, priority: p.prio,
        technicalRating: p.tech, physicalRating: p.phys,
        mentalRating: p.mental, potentialRating: p.pot,
    })), { ignoreDuplicates: true });

    console.log('✅ Scouting seeded (3 watchlist prospects)');
}