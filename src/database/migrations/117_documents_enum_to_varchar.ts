import { QueryInterface } from "sequelize";

/**
 * Convert three ENUM columns in the documents table to VARCHAR(50).
 * CLAUDE.md mandates VARCHAR(50) for enum-like fields — Zod handles validation.
 * Uses raw SQL; queryInterface.changeColumn is not available in this project's
 * Umzug setup. PostgreSQL casts ENUM values to text transparently.
 */
export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    ALTER TABLE documents
      ALTER COLUMN entity_type TYPE VARCHAR(50) USING entity_type::text,
      ALTER COLUMN type        TYPE VARCHAR(50) USING type::text,
      ALTER COLUMN status      TYPE VARCHAR(50) USING status::text;
  `);

  // Drop the now-orphaned PostgreSQL ENUM types created by Sequelize
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_documents_entity_type') THEN
        DROP TYPE "enum_documents_entity_type";
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_documents_type') THEN
        DROP TYPE "enum_documents_type";
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_documents_status') THEN
        DROP TYPE "enum_documents_status";
      END IF;
    END $$;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}): Promise<void> {
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_documents_entity_type" AS ENUM ('Player', 'Contract', 'Match', 'Injury', 'Club', 'Offer');
    CREATE TYPE "enum_documents_type"        AS ENUM ('Contract', 'Passport', 'Medical', 'ID', 'Agreement', 'Other');
    CREATE TYPE "enum_documents_status"      AS ENUM ('Active', 'Valid', 'Pending', 'Expired');

    ALTER TABLE documents
      ALTER COLUMN entity_type TYPE "enum_documents_entity_type" USING entity_type::"enum_documents_entity_type",
      ALTER COLUMN type        TYPE "enum_documents_type"        USING type::"enum_documents_type",
      ALTER COLUMN status      TYPE "enum_documents_status"      USING status::"enum_documents_status";
  `);
}
