import { sequelize } from "@config/database";

export async function up() {
  // Encrypted fields (phone, guardian_phone, email) need room for
  // base64 iv:tag:ciphertext output (~70+ chars for short inputs)
  await sequelize.query(`
    ALTER TABLE players
      ALTER COLUMN phone TYPE VARCHAR(255),
      ALTER COLUMN guardian_phone TYPE VARCHAR(255),
      ALTER COLUMN guardian_relation TYPE VARCHAR(100);
  `);
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE players
      ALTER COLUMN guardian_phone TYPE VARCHAR(50),
      ALTER COLUMN guardian_relation TYPE VARCHAR(50);
  `);
}
