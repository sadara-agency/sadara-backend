import { sequelize } from "@config/database";

/**
 * Add verification columns to gate_checklists for auto-verification engine.
 *
 * New columns:
 * - verification_type: manual | auto | auto_with_override
 * - verification_rule: JSONB condition for auto-checks
 * - auto_verified: last auto-check result
 * - auto_verified_details: JSONB details/reason from auto-check
 * - last_verified_at: when auto-check last ran
 * - overridden_by: UUID of admin/GM who overrode
 * - overridden_at: when override happened
 */

export async function up() {
  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_gate_checklists_verification_type') THEN
        CREATE TYPE "enum_gate_checklists_verification_type" AS ENUM ('manual', 'auto', 'auto_with_override');
      END IF;
    END $$;
  `);

  await sequelize.query(`
    ALTER TABLE gate_checklists
      ADD COLUMN IF NOT EXISTS verification_type "enum_gate_checklists_verification_type" NOT NULL DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS verification_rule JSONB,
      ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_verified_details JSONB,
      ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS overridden_by UUID,
      ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;
  `);

  // Backfill existing items: assign verification rules to known template items
  const RULES: Record<string, { type: string; rule: object }> = {
    // Gate 0
    "Collect player identification documents (ID / Passport)": {
      type: "auto",
      rule: {
        check: "has_document",
        entityType: "Player",
        docType: ["ID", "Passport"],
        status: ["Active", "Valid"],
      },
    },
    "Obtain signed representation agreement": {
      type: "auto",
      rule: {
        check: "has_contract",
        contractType: "Representation",
        requireSignature: true,
      },
    },
    "Complete medical examination & fitness assessment": {
      type: "auto",
      rule: {
        check: "has_document",
        entityType: "Player",
        docType: ["Medical"],
        status: ["Active", "Valid"],
      },
    },
    "Verify player registration with federation": {
      type: "auto",
      rule: {
        check: "player_field",
        field: "currentClubId",
        condition: "not_null",
      },
    },
    "Upload player photo & profile data": {
      type: "auto",
      rule: {
        check: "player_fields_filled",
        fields: ["photoUrl", "nationality", "position", "dateOfBirth"],
      },
    },
    "Guardian consent form (if youth player)": {
      type: "auto",
      rule: {
        check: "conditional",
        condition: {
          check: "player_field",
          field: "playerType",
          value: "Youth",
        },
        then: {
          check: "player_fields_filled",
          fields: ["guardianName", "guardianPhone"],
        },
        else: "skip",
      },
    },
    // Gate 1
    "Complete initial performance assessment": {
      type: "auto",
      rule: {
        check: "player_fields_filled",
        fields: [
          "speed",
          "passing",
          "shooting",
          "defense",
          "fitness",
          "tactical",
        ],
      },
    },
    "Create Individual Development Plan (IDP)": {
      type: "auto_with_override",
      rule: {
        check: "has_note",
        ownerType: "Player",
        contentContains: "development plan",
      },
    },
    "Set short-term performance goals": {
      type: "manual",
      rule: null as any,
    },
    "Assign development coach / mentor": {
      type: "auto",
      rule: { check: "player_field", field: "coachId", condition: "not_null" },
    },
    "Record baseline statistics": {
      type: "auto",
      rule: { check: "has_scouting_stats" },
    },
    // Gate 2
    "Mid-season performance review": {
      type: "auto_with_override",
      rule: { check: "has_note", ownerType: "Player", afterGateStart: true },
    },
    "Update market valuation": {
      type: "auto",
      rule: { check: "has_valuation", afterGateStart: true },
    },
    "Review IDP progress & adjust goals": {
      type: "manual",
      rule: null as any,
    },
    "Collect performance data & match statistics": {
      type: "auto",
      rule: { check: "player_stats_updated", afterGateStart: true },
    },
    "Stakeholder feedback report": {
      type: "manual",
      rule: null as any,
    },
    // Gate 3
    "End-of-season comprehensive review": {
      type: "auto_with_override",
      rule: { check: "has_note", ownerType: "Player", afterGateStart: true },
    },
    "Contract renewal recommendation": {
      type: "auto_with_override",
      rule: {
        check: "has_note",
        ownerType: "Player",
        contentContains: "renewal",
        afterGateStart: true,
      },
    },
    "Final market valuation update": {
      type: "auto",
      rule: { check: "has_valuation", afterGateStart: true },
    },
    "Transfer window strategy assessment": {
      type: "manual",
      rule: null as any,
    },
    "Player satisfaction interview": {
      type: "manual",
      rule: null as any,
    },
  };

  for (const [item, { type, rule }] of Object.entries(RULES)) {
    if (rule) {
      await sequelize.query(
        `UPDATE gate_checklists
         SET verification_type = :type,
             verification_rule = :rule
         WHERE item = :item AND verification_type = 'manual'`,
        { replacements: { type, rule: JSON.stringify(rule), item } },
      );
    }
  }
}

export async function down() {
  await sequelize.query(`
    ALTER TABLE gate_checklists
      DROP COLUMN IF EXISTS verification_type,
      DROP COLUMN IF EXISTS verification_rule,
      DROP COLUMN IF EXISTS auto_verified,
      DROP COLUMN IF EXISTS auto_verified_details,
      DROP COLUMN IF EXISTS last_verified_at,
      DROP COLUMN IF EXISTS overridden_by,
      DROP COLUMN IF EXISTS overridden_at;
  `);

  await sequelize.query(`
    DROP TYPE IF EXISTS "enum_gate_checklists_verification_type";
  `);
}
