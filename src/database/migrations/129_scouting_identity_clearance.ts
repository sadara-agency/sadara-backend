import { QueryInterface } from "sequelize";

/**
 * Scouting — Identity Verification & Legal Clearance Protocol.
 *
 * Adds nine columns to `screening_cases` to capture:
 *  - the Player ID Card document reference (identity verification)
 *  - the boolean "has existing agency contract?" answer
 *  - the Agency Clearance document reference + Manager/Admin verification
 *  - audit trail of the resulting Player + Contract after sign-off
 *
 * No changes required on `documents` (already VARCHAR(50), no CHECK constraint —
 * Zod validates "Scouting" entity_type and "Clearance" type at the app layer).
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE screening_cases
      ADD COLUMN IF NOT EXISTS has_existing_agency_contract BOOLEAN,
      ADD COLUMN IF NOT EXISTS id_card_document_id    UUID REFERENCES documents(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS clearance_document_id  UUID REFERENCES documents(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS clearance_verified_at  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS clearance_verified_by  UUID REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS signed_player_id       UUID REFERENCES players(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS signed_contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS signed_at              TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS signed_by              UUID REFERENCES users(id) ON DELETE SET NULL;
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_screening_cases_signed_player
      ON screening_cases (signed_player_id);
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_screening_cases_id_card_doc
      ON screening_cases (id_card_document_id);
  `);

  await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_screening_cases_clearance_doc
      ON screening_cases (clearance_document_id);
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    DROP INDEX IF EXISTS idx_screening_cases_clearance_doc;
    DROP INDEX IF EXISTS idx_screening_cases_id_card_doc;
    DROP INDEX IF EXISTS idx_screening_cases_signed_player;
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE screening_cases
      DROP COLUMN IF EXISTS signed_by,
      DROP COLUMN IF EXISTS signed_at,
      DROP COLUMN IF EXISTS signed_contract_id,
      DROP COLUMN IF EXISTS signed_player_id,
      DROP COLUMN IF EXISTS clearance_verified_by,
      DROP COLUMN IF EXISTS clearance_verified_at,
      DROP COLUMN IF EXISTS clearance_document_id,
      DROP COLUMN IF EXISTS id_card_document_id,
      DROP COLUMN IF EXISTS has_existing_agency_contract;
  `);
}
