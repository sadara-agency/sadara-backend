// ─────────────────────────────────────────────────────────────
// src/database/seed/players.seed.ts
// ─────────────────────────────────────────────────────────────
import { Player } from './../modules/players/player.model';
import { IDS } from './ids';

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min));

export async function seedPlayers() {
    const players = [
        // Pro players
        { firstName: 'Salem',       lastName: 'Al-Dawsari',  firstNameAr: 'سالم',      lastNameAr: 'الدوسري',   dob: '1991-08-19', pos: 'LW', type: 'Pro' as const, clubId: IDS.clubs.alHilal,   value: 12000000, email: 'salem@sadara.com' },
        { firstName: 'Yasser',      lastName: 'Al-Shahrani', firstNameAr: 'ياسر',      lastNameAr: 'الشهراني',  dob: '1992-05-25', pos: 'LB', type: 'Pro' as const, clubId: IDS.clubs.alHilal,   value: 8000000 },
        { firstName: 'Abdulrahman', lastName: 'Ghareeb',     firstNameAr: 'عبدالرحمن', lastNameAr: 'غريب',      dob: '1997-03-11', pos: 'RW', type: 'Pro' as const, clubId: IDS.clubs.alAhli,    value: 7000000 },
        { firstName: 'Firas',       lastName: 'Al-Buraikan', firstNameAr: 'فراس',      lastNameAr: 'البريكان',  dob: '2000-05-14', pos: 'ST', type: 'Pro' as const, clubId: IDS.clubs.alAhli,    value: 9500000 },
        { firstName: 'Saud',        lastName: 'Abdulhamid',  firstNameAr: 'سعود',      lastNameAr: 'عبدالحميد', dob: '1999-07-18', pos: 'RB', type: 'Pro' as const, clubId: IDS.clubs.alHilal,   value: 6500000 },
        { firstName: 'Abdullah',    lastName: 'Al-Hamdan',   firstNameAr: 'عبدالله',   lastNameAr: 'الحمدان',   dob: '1999-09-13', pos: 'ST', type: 'Pro' as const, clubId: IDS.clubs.alIttihad, value: 5500000 },
        { firstName: 'Hassan',      lastName: 'Kadesh',      firstNameAr: 'حسن',       lastNameAr: 'كادش',      dob: '1992-10-30', pos: 'CM', type: 'Pro' as const, clubId: IDS.clubs.alShabab,  value: 3500000 },
        { firstName: 'Nawaf',       lastName: 'Al-Abed',     firstNameAr: 'نواف',      lastNameAr: 'العابد',    dob: '1990-01-26', pos: 'AM', type: 'Pro' as const, clubId: IDS.clubs.alHilal,   value: 4000000 },
        { firstName: 'Turki',       lastName: 'Al-Ammar',    firstNameAr: 'تركي',      lastNameAr: 'العمار',    dob: '1997-06-20', pos: 'CM', type: 'Pro' as const, clubId: IDS.clubs.alNassr,   value: 3000000 },
        { firstName: 'Mohammed',    lastName: 'Kanno',       firstNameAr: 'محمد',      lastNameAr: 'كنو',       dob: '1994-09-22', pos: 'CM', type: 'Pro' as const, clubId: IDS.clubs.alHilal,   value: 7500000 },
        // Youth players
        { firstName: 'Musab',  lastName: 'Al-Juwayr',  firstNameAr: 'مصعب', lastNameAr: 'الجويعر',  dob: '2006-03-15', pos: 'RW', type: 'Youth' as const, clubId: IDS.clubs.alNassr,   value: 500000 },
        { firstName: 'Ali',    lastName: 'Al-Hassan',  firstNameAr: 'علي',  lastNameAr: 'الحسن',    dob: '2007-07-20', pos: 'CB', type: 'Youth' as const, clubId: IDS.clubs.alAhli,    value: 350000 },
        { firstName: 'Omar',   lastName: 'Al-Ghamdi',  firstNameAr: 'عمر',  lastNameAr: 'الغامدي',  dob: '2006-11-02', pos: 'GK', type: 'Youth' as const, clubId: IDS.clubs.alIttihad, value: 250000 },
        { firstName: 'Rayan',  lastName: 'Al-Mutairi', firstNameAr: 'ريان', lastNameAr: 'المطيري',  dob: '2005-08-09', pos: 'ST', type: 'Youth' as const, clubId: IDS.clubs.alShabab,  value: 600000 },
        { firstName: 'Fahad',  lastName: 'Al-Qahtani', firstNameAr: 'فهد',  lastNameAr: 'القحطاني', dob: '2007-01-25', pos: 'LB', type: 'Youth' as const, clubId: IDS.clubs.alFateh,   value: 200000 },
    ];

    const records = players.map((p, i) => ({
        id: IDS.players[i],
        firstName: p.firstName, lastName: p.lastName,
        firstNameAr: p.firstNameAr, lastNameAr: p.lastNameAr,
        email: (p as any).email ?? null,
        dateOfBirth: p.dob, nationality: 'Saudi Arabia',
        playerType: p.type, position: p.pos,
        currentClubId: p.clubId, agentId: IDS.users.agent,
        marketValue: p.value, marketValueCurrency: 'SAR' as const,
        status: 'active' as const,
        speed: rand(50, 90), passing: rand(50, 90), shooting: rand(50, 90),
        defense: rand(50, 90), fitness: rand(60, 90), tactical: rand(50, 90),
        createdBy: IDS.users.admin,
    }));

    await Player.bulkCreate(records, { ignoreDuplicates: true });
    console.log('✅ Players seeded (10 Pro + 5 Youth)');
}
