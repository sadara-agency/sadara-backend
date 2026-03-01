// ─────────────────────────────────────────────────────────────
// src/database/seed/matches.seed.ts
// ─────────────────────────────────────────────────────────────
import { Match } from './../modules/matches/match.model';
import { MatchPlayer } from './../modules/matches/matchPlayer.model';
import { PlayerMatchStats } from './../modules/matches/playerMatchStats.model';
import { sequelize } from './../config/database';
import { QueryTypes } from 'sequelize';
import { IDS } from './ids';

export async function seedMatches() {
    const data = [
        { home: 'alHilal',   away: 'alNassr',   date: '2026-03-05', comp: 'Saudi Pro League', status: 'upcoming' },
        { home: 'alAhli',    away: 'alIttihad', date: '2026-03-08', comp: 'Saudi Pro League', status: 'upcoming' },
        { home: 'alShabab',  away: 'alFateh',   date: '2026-03-12', comp: 'Saudi Pro League', status: 'upcoming' },
        { home: 'alHilal',   away: 'alAhli',    date: '2026-02-20', comp: 'Saudi Pro League', status: 'completed', hs: 2, as: 1 },
        { home: 'alNassr',   away: 'alShabab',  date: '2026-02-15', comp: 'Saudi Pro League', status: 'completed', hs: 3, as: 0 },
        { home: 'alIttihad', away: 'alTaawoun', date: '2026-02-10', comp: 'Saudi Pro League', status: 'completed', hs: 1, as: 1 },
        { home: 'alHilal',   away: 'alIttihad', date: '2026-03-20', comp: "King's Cup",       status: 'upcoming' },
        { home: 'alRaed',    away: 'alFateh',   date: '2026-03-22', comp: 'Saudi Pro League', status: 'upcoming' },
    ];

    await Match.bulkCreate(data.map((m, i) => ({
        id: IDS.matches[i],
        homeClubId: (IDS.clubs as any)[m.home],
        awayClubId: (IDS.clubs as any)[m.away],
        matchDate: new Date(m.date), competition: m.comp, season: '2025-26',
        status: m.status as any,
        homeScore: (m as any).hs ?? null, awayScore: (m as any).as ?? null,
        venue: 'TBD',
    })), { ignoreDuplicates: true });

    console.log('✅ Matches seeded (8)');
}

export async function seedMatchPlayers() {
    const avail: Array<'starter'|'bench'|'injured'> = ['starter','starter','starter','starter','bench','bench','injured'];
    const assignments = [
        { matchId: 3, players: [0,1,4,7,9,2,3] },
        { matchId: 4, players: [8,6,13] },
        { matchId: 5, players: [5] },
        { matchId: 0, players: [0,1,4,9,8] },
        { matchId: 1, players: [2,3,5] },
    ];

    const records: any[] = [];
    let idx = 0;
    for (const a of assignments) {
        for (let i = 0; i < a.players.length; i++) {
            const av = avail[i % avail.length];
            records.push({
                id: IDS.matchPlayers[idx++],
                matchId: IDS.matches[a.matchId],
                playerId: IDS.players[a.players[i]],
                availability: av,
                minutesPlayed: av === 'starter' ? 60 + Math.floor(Math.random() * 30) : (av === 'bench' ? Math.floor(Math.random() * 30) : null),
                notes: av === 'injured' ? 'Hamstring strain' : null,
            });
        }
    }

    await MatchPlayer.bulkCreate(records, { ignoreDuplicates: true });
    console.log(`✅ Match players seeded (${records.length})`);
}

export async function seedMatchStats() {
    const groups = [
        { matchId: 3, players: [0,1,4,9,2,3] },
        { matchId: 4, players: [8,6] },
        { matchId: 5, players: [5] },
    ];

    const records: any[] = [];
    let idx = 0;
    for (const g of groups) {
        for (const pid of g.players) {
            const mins = 60 + Math.floor(Math.random() * 30);
            records.push({
                id: IDS.matchStats[idx++],
                playerId: IDS.players[pid], matchId: IDS.matches[g.matchId],
                minutesPlayed: mins,
                goals: Math.random() > 0.65 ? Math.floor(Math.random() * 2) + 1 : 0,
                assists: Math.random() > 0.55 ? 1 : 0,
                shotsTotal: Math.floor(Math.random() * 5) + 1,
                shotsOnTarget: Math.floor(Math.random() * 3),
                passesTotal: 20 + Math.floor(Math.random() * 40),
                passesCompleted: 15 + Math.floor(Math.random() * 30),
                tacklesTotal: Math.floor(Math.random() * 5),
                interceptions: Math.floor(Math.random() * 4),
                duelsWon: Math.floor(Math.random() * 6),
                duelsTotal: 3 + Math.floor(Math.random() * 8),
                dribblesCompleted: Math.floor(Math.random() * 4),
                dribblesAttempted: 1 + Math.floor(Math.random() * 5),
                foulsCommitted: Math.floor(Math.random() * 3),
                foulsDrawn: Math.floor(Math.random() * 3),
                yellowCards: Math.random() > 0.8 ? 1 : 0, redCards: 0,
                rating: Number((6 + Math.random() * 3).toFixed(1)),
            });
        }
    }

    await PlayerMatchStats.bulkCreate(records, { ignoreDuplicates: true });
    console.log(`✅ Match stats seeded (${records.length})`);
}

export async function seedPerformances() {
    const matchIds = [IDS.matches[3], IDS.matches[4], IDS.matches[5]];
    const playerIds = IDS.players.slice(0, 10);

    for (const matchId of matchIds) {
        for (let i = 0; i < 4; i++) {
            const pid = playerIds[Math.floor(Math.random() * playerIds.length)];
            await sequelize.query(
                `INSERT INTO performances (player_id, match_id, average_rating, goals, assists, key_passes, successful_dribbles, minutes)
                 VALUES (:pid, :mid, :rating, :goals, :assists, :kp, :sd, :mins) ON CONFLICT DO NOTHING`,
                { replacements: {
                    pid, mid: matchId,
                    rating: (6 + Math.random() * 3).toFixed(1),
                    goals: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0,
                    assists: Math.random() > 0.6 ? 1 : 0,
                    kp: Math.floor(Math.random() * 5),
                    sd: Math.floor(Math.random() * 4),
                    mins: 60 + Math.floor(Math.random() * 30),
                }, type: QueryTypes.INSERT }
            );
        }
    }
    console.log('✅ Performances seeded');
}
