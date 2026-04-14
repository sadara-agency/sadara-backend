import { QueryInterface } from "sequelize";

/**
 * Migration 123
 *
 * Production safety net: migration 117 converted the documents table's three
 * ENUM columns to VARCHAR(50) but the DROP TYPE statements failed in some
 * environments because PostgreSQL auto-generates array-type dependents
 * (_enum_documents_*) alongside every ENUM definition.
 *
 * This migration drops the three orphaned types with CASCADE so they are
 * removed regardless of whether 117 left them behind.
 * Safe to run even if the types no longer exist (IF NOT EXISTS guards).
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    DROP TYPE IF EXISTS "enum_documents_entity_type" CASCADE;
    DROP TYPE IF EXISTS "enum_documents_type"        CASCADE;
    DROP TYPE IF EXISTS "enum_documents_status"      CASCADE;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  // Restore only if the columns were somehow reverted to ENUM — normally a no-op.
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_documents_type') THEN
        CREATE TYPE "enum_documents_entity_type" AS ENUM ('Player','Contract','Match','Injury','Club','Offer');
        CREATE TYPE "enum_documents_type"        AS ENUM ('Contract','Passport','Medical','ID','Agreement','Other');
        CREATE TYPE "enum_documents_status"      AS ENUM ('Active','Valid','Pending','Expired');
      END IF;
    END $$;
  `);
}
