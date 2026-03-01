// ─────────────────────────────────────────────────────────────
// src/database/seed/users.seed.ts
// ─────────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import { User } from './../modules/Users/user.model';
import { env } from './../config/env';
import { IDS } from './ids';

export async function seedUsers() {
    const hash = await bcrypt.hash('Sadara2025!', env.bcrypt.saltRounds);

    await User.bulkCreate([
        { id: IDS.users.admin, email: 'admin@sadara.com', passwordHash: hash, fullName: 'Abdulaziz Al-Rashid', fullNameAr: 'عبدالعزيز الراشد', role: 'Admin', isActive: true },
        { id: IDS.users.agent, email: 'agent@sadara.com', passwordHash: hash, fullName: 'Faisal Al-Dosari', fullNameAr: 'فيصل الدوسري', role: 'Agent', isActive: true },
        { id: IDS.users.analyst, email: 'analyst@sadara.com', passwordHash: hash, fullName: 'Nora Al-Otaibi', fullNameAr: 'نورة العتيبي', role: 'Analyst', isActive: true },
        { id: IDS.users.scout, email: 'scout@sadara.com', passwordHash: hash, fullName: 'Khalid Al-Ghamdi', fullNameAr: 'خالد الغامدي', role: 'Scout', isActive: true },
        { id: IDS.users.player, email: 'salem@sadara.com', passwordHash: hash, fullName: 'Salem Al-Dawsari', fullNameAr: 'سالم الدوسري', role: 'Player', isActive: true, playerId: IDS.players[0] },
    ], { ignoreDuplicates: true });

    console.log('✅ Users seeded (5 accounts — password: Sadara2025!)');
}
