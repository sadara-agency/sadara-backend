// ─────────────────────────────────────────────────────────────
// src/database/seed/contracts.seed.ts
// ─────────────────────────────────────────────────────────────
import { Contract } from './../modules/contracts/contract.model';
import { IDS } from './ids';

export async function seedContracts() {
    const data = [
        { pid: 0,  club: 'alHilal',   type: 'Representation',   start: '2024-01-01', end: '2027-06-30', salary: 2500000, comm: 10, status: 'Active' },
        { pid: 1,  club: 'alHilal',   type: 'Representation',   start: '2024-06-01', end: '2026-05-31', salary: 1800000, comm: 8,  status: 'Active' },
        { pid: 2,  club: 'alAhli',    type: 'CareerManagement', start: '2023-07-01', end: '2026-06-30', salary: 1500000, comm: 12, status: 'Active' },
        { pid: 3,  club: 'alAhli',    type: 'Representation',   start: '2025-01-01', end: '2028-12-31', salary: 2200000, comm: 10, status: 'Active' },
        { pid: 4,  club: 'alHilal',   type: 'Representation',   start: '2024-03-01', end: '2026-04-15', salary: 1400000, comm: 8,  status: 'Expiring Soon' },
        { pid: 5,  club: 'alIttihad', type: 'Representation',   start: '2023-01-01', end: '2026-01-01', salary: 1200000, comm: 10, status: 'Expired' },
        { pid: 6,  club: 'alShabab',  type: 'CareerManagement', start: '2025-02-01', end: '2028-01-31', salary: 900000,  comm: 15, status: 'Active' },
        { pid: 7,  club: 'alHilal',   type: 'Representation',   start: '2024-07-01', end: '2026-06-30', salary: 1000000, comm: 8,  status: 'Active' },
        { pid: 8,  club: 'alNassr',   type: 'Transfer',         start: '2025-01-15', end: '2027-01-14', salary: 800000,  comm: 10, status: 'Draft' },
        { pid: 9,  club: 'alHilal',   type: 'Representation',   start: '2024-08-01', end: '2027-07-31', salary: 1700000, comm: 10, status: 'Active' },
        { pid: 10, club: 'alNassr',   type: 'Representation',   start: '2025-01-01', end: '2029-12-31', salary: 200000,  comm: 15, status: 'Active' },
        { pid: 13, club: 'alShabab',  type: 'CareerManagement', start: '2025-03-01', end: '2030-02-28', salary: 250000,  comm: 15, status: 'Active' },
    ];

    await Contract.bulkCreate(data.map((c, i) => ({
        id: IDS.contracts[i],
        playerId: IDS.players[c.pid],
        clubId: (IDS.clubs as any)[c.club],
        category: 'Club' as const,
        contractType: c.type as any, status: c.status as any,
        title: `${c.type} Agreement`,
        startDate: c.start, endDate: c.end,
        baseSalary: c.salary, salaryCurrency: 'SAR' as const,
        commissionPct: c.comm,
        totalCommission: Math.round(c.salary * (c.comm / 100)),
        signingBonus: Math.round(c.salary * 0.05),
        performanceBonus: Math.round(c.salary * 0.1),
        exclusivity: 'Exclusive' as const,
        representationScope: 'Both' as const,
        createdBy: IDS.users.admin,
    })), { ignoreDuplicates: true });

    console.log('✅ Contracts seeded (12)');
}
