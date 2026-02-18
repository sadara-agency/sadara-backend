/**
 * Run this once to fix seed user passwords:
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-seed-passwords.ts
 * 
 * Sets all seed users to password: "sadara123"
 */
import bcrypt from 'bcryptjs';
import { sequelize } from '../src/config/database';
import { QueryTypes } from 'sequelize';

async function fixPasswords() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        const hash = await bcrypt.hash('sadara123', 12);
        console.log(`🔑 Generated bcrypt hash for "sadara123"`);

        const [result] = await sequelize.query(
            `UPDATE users SET password_hash = $1 WHERE email LIKE '%@sadara.com' RETURNING email, role`,
            { bind: [hash], type: QueryTypes.SELECT }
        );

        console.log('✅ Updated passwords for:');
        const updated = await sequelize.query(
            `SELECT email, role FROM users WHERE email LIKE '%@sadara.com'`,
            { type: QueryTypes.SELECT }
        );
        (updated as any[]).forEach((u: any) => {
            console.log(`   📧 ${u.email} (${u.role})`);
        });

        console.log('\n🎉 Done! You can now login with:');
        console.log('   Email:    admin@sadara.com');
        console.log('   Password: sadara123');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await sequelize.close();
    }
}

fixPasswords();