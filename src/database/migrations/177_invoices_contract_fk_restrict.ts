// ═══════════════════════════════════════════════════════════════
// Migration 177: invoices.contract_id FK → ON DELETE RESTRICT
//
// Finance records must outlive contract deletion. The Invoice model
// previously had no Sequelize-level `references:` block, so the column
// may not have a DB-level FK constraint at all in some environments.
// We drop any existing constraint defensively and add a fresh one.
//
// Skips entirely if the `invoices` table does not exist (fresh-DB CI).
// ═══════════════════════════════════════════════════════════════

import { QueryInterface } from "sequelize";
import { sequelize } from "@config/database";
import { tableExists } from "../migrationHelpers";

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "invoices"))) return;
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE invoices
        DROP CONSTRAINT IF EXISTS invoices_contract_id_fkey;
      ALTER TABLE invoices
        ADD CONSTRAINT invoices_contract_id_fkey
          FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE RESTRICT;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "invoices"))) return;
  await sequelize.query(`
    DO $$ BEGIN
      ALTER TABLE invoices
        DROP CONSTRAINT IF EXISTS invoices_contract_id_fkey;
    EXCEPTION WHEN undefined_table THEN NULL;
    END $$;
  `);
}
