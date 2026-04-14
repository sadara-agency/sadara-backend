import { QueryInterface, DataTypes } from "sequelize";

/**
 * Convert three ENUM columns in the documents table to VARCHAR(50).
 * CLAUDE.md mandates VARCHAR(50) for enum-like fields — Zod handles validation.
 * Existing data is preserved; PostgreSQL casts ENUM values to text transparently.
 */
export async function up(queryInterface: QueryInterface) {
  // entity_type: ENUM → VARCHAR(50)
  await queryInterface.changeColumn("documents", "entity_type", {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  // type: ENUM → VARCHAR(50)
  await queryInterface.changeColumn("documents", "type", {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "Other",
  });

  // status: ENUM → VARCHAR(50)
  await queryInterface.changeColumn("documents", "status", {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: "Active",
  });

  // Drop the now-orphaned PostgreSQL ENUM types created by Sequelize
  await queryInterface.sequelize.query(
    `DO $$ BEGIN
       IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_documents_entity_type') THEN
         DROP TYPE "enum_documents_entity_type";
       END IF;
       IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_documents_type') THEN
         DROP TYPE "enum_documents_type";
       END IF;
       IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_documents_status') THEN
         DROP TYPE "enum_documents_status";
       END IF;
     END $$;`,
  );
}

export async function down(queryInterface: QueryInterface) {
  // Restore entity_type ENUM
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_documents_entity_type" AS ENUM ('Player', 'Contract', 'Match', 'Injury', 'Club', 'Offer')`,
  );
  await queryInterface.changeColumn("documents", "entity_type", {
    type: DataTypes.ENUM(
      "Player",
      "Contract",
      "Match",
      "Injury",
      "Club",
      "Offer",
    ) as any,
    allowNull: true,
  });

  // Restore type ENUM
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_documents_type" AS ENUM ('Contract', 'Passport', 'Medical', 'ID', 'Agreement', 'Other')`,
  );
  await queryInterface.changeColumn("documents", "type", {
    type: DataTypes.ENUM(
      "Contract",
      "Passport",
      "Medical",
      "ID",
      "Agreement",
      "Other",
    ) as any,
    allowNull: false,
    defaultValue: "Other",
  });

  // Restore status ENUM
  await queryInterface.sequelize.query(
    `CREATE TYPE "enum_documents_status" AS ENUM ('Active', 'Valid', 'Pending', 'Expired')`,
  );
  await queryInterface.changeColumn("documents", "status", {
    type: DataTypes.ENUM("Active", "Valid", "Pending", "Expired") as any,
    allowNull: false,
    defaultValue: "Active",
  });
}
