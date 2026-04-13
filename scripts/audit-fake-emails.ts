/**
 * Audit the users table for fake / placeholder email addresses.
 *
 * Usage (from backend/):
 *   npx ts-node -r tsconfig-paths/register scripts/audit-fake-emails.ts
 *
 * Output:
 *   - Total user count
 *   - Count per fake pattern (@sadara.com, @example.com, @test.com, etc.)
 *   - First 50 offenders (email + role + active flag)
 *
 * Exit code 0 always — this is a read-only audit, not a gate.
 */
import { sequelize } from "../src/config/database";
import { QueryTypes } from "sequelize";

const FAKE_PATTERNS = [
  { label: "@sadara.com", like: "%@sadara.com" },
  { label: "@example.com", like: "%@example.com" },
  { label: "@test.com", like: "%@test.com" },
  { label: "@localhost", like: "%@localhost" },
  { label: "admin@ (any domain)", like: "admin@%" },
  { label: "noreply@ (any domain)", like: "noreply@%" },
  { label: "test@ (any domain)", like: "test@%" },
];

interface UserRow {
  email: string;
  role: string;
  is_active: boolean;
}

async function audit() {
  await sequelize.authenticate();
  console.log("✅ Connected to database\n");

  const [{ total }] = await sequelize.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM users`,
    { type: QueryTypes.SELECT },
  );
  console.log(`👥 Total users: ${total}\n`);

  console.log("── Fake / placeholder email patterns ──");
  const offenderEmails = new Set<string>();

  for (const { label, like } of FAKE_PATTERNS) {
    const rows = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE email ILIKE :like`,
      { replacements: { like }, type: QueryTypes.SELECT },
    );
    const count = Number(rows[0]?.count || 0);
    const marker = count > 0 ? "⚠️ " : "  ";
    console.log(`  ${marker}${label.padEnd(30)} ${count}`);
  }

  console.log("\n── First 50 offenders ──");
  const offenders = await sequelize.query<UserRow>(
    `
    SELECT email, role, is_active
    FROM users
    WHERE email ILIKE '%@sadara.com'
       OR email ILIKE '%@example.com'
       OR email ILIKE '%@test.com'
       OR email ILIKE '%@localhost'
       OR email ILIKE 'admin@%'
       OR email ILIKE 'noreply@%'
       OR email ILIKE 'test@%'
    ORDER BY email
    LIMIT 50
    `,
    { type: QueryTypes.SELECT },
  );

  if (offenders.length === 0) {
    console.log("  ✅ No fake email addresses found.");
  } else {
    for (const row of offenders) {
      offenderEmails.add(row.email);
      const status = row.is_active ? "active" : "inactive";
      console.log(`  ${row.email.padEnd(40)} ${row.role.padEnd(20)} ${status}`);
    }
    console.log(`\n  Showing ${offenders.length} of the matching rows.`);
  }

  console.log("\n── Summary ──");
  if (offenderEmails.size === 0) {
    console.log("  ✅ Clean: no fake emails in the users table.");
  } else {
    console.log(
      `  ⚠️  Found ${offenderEmails.size} user(s) with placeholder emails.`,
    );
    console.log(
      "     These are expected in development (seed fixtures) but must not exist in production.",
    );
  }

  await sequelize.close();
}

audit().catch((err) => {
  console.error("❌ Audit failed:", err);
  process.exit(1);
});
