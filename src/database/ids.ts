// ─────────────────────────────────────────────────────────────
// src/database/seed/ids.ts
// Fixed UUIDs for consistency across all seed modules.
// ─────────────────────────────────────────────────────────────

function generateIds(prefix: string, count: number): string[] {
    return Array.from({ length: count }, (_, i) =>
        `${prefix}-0000-0000-0000-${String(i + 1).padStart(12, '0')}`
    );
}

export const IDS = {
    users: {
        admin:   'a0000001-0000-0000-0000-000000000001',
        agent:   'a0000001-0000-0000-0000-000000000002',
        analyst: 'a0000001-0000-0000-0000-000000000003',
        scout:   'a0000001-0000-0000-0000-000000000004',
        player:  'a0000001-0000-0000-0000-000000000005',
    },
    clubs: {
        alHilal:   'c0000001-0000-0000-0000-000000000001',
        alNassr:   'c0000001-0000-0000-0000-000000000002',
        alAhli:    'c0000001-0000-0000-0000-000000000003',
        alIttihad: 'c0000001-0000-0000-0000-000000000004',
        alShabab:  'c0000001-0000-0000-0000-000000000005',
        alFateh:   'c0000001-0000-0000-0000-000000000006',
        alTaawoun: 'c0000001-0000-0000-0000-000000000007',
        alRaed:    'c0000001-0000-0000-0000-000000000008',
    },
    players:      generateIds('p0000001', 15),
    contracts:    generateIds('ct000001', 12),
    matches:      generateIds('m0000001', 8),
    offers:       generateIds('of000001', 5),
    tasks:        generateIds('tk000001', 8),
    invoices:     generateIds('iv000001', 4),
    payments:     generateIds('py000001', 6),
    documents:    generateIds('dc000001', 5),
    gates:        generateIds('gt000001', 4),
    referrals:    generateIds('rf000001', 3),
    watchlists:   generateIds('wl000001', 3),
    matchPlayers: generateIds('mp000001', 15),
    matchStats:   generateIds('ms000001', 15),
};
