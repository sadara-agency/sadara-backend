import { sequelize } from "../../config/database";

/**
 * Migration 024: RBAC Audit — Tighten permissions & add field-level hiding
 *
 * 1. Re-seeds the entire role_permissions table via the updated seed file
 * 2. Adds field-level hiding for injuries, scouting, offers, players (nationalId)
 * 3. Adds contract agent fields to field hiding
 */

export async function up() {
  // ── 1. Re-seed module-level permissions ──
  // The seedPermissions() function uses updateOnDuplicate, so it will
  // update existing rows and insert new ones. We also need to delete
  // permissions that were removed (roles that no longer have access).
  // Instead of deleting, we set canRead/canCreate/canUpdate/canDelete = false
  // for roles that should lose access. The seed handles this via dedup(OR).
  //
  // However, since the seed only inserts rows with TRUE flags and uses OR merge,
  // we need to explicitly revoke permissions for removed role+module combos.
  // We'll reset all non-Admin permissions and let the seed re-apply them.

  await sequelize.query(`
    UPDATE role_permissions
    SET can_create = false, can_read = false, can_update = false, can_delete = false
    WHERE role != 'Admin';
  `);

  // Re-seed will be handled by the application's seedPermissions() call on startup.
  // This migration focuses on the field-level permission additions.

  // ── 2. Add field-level hiding for NEW modules ──

  await sequelize.query(`
    INSERT INTO role_field_permissions (role, module, field, hidden) VALUES
    -- PLAYERS: nationalId (sensitive identity document)
    ('Scout',     'players', 'nationalId', true),
    ('Player',    'players', 'nationalId', true),
    ('Finance',   'players', 'nationalId', true),
    ('Media',     'players', 'nationalId', true),
    ('Executive', 'players', 'nationalId', true),
    ('Coach',     'players', 'nationalId', true),
    ('GymCoach',  'players', 'nationalId', true),

    -- CONTRACTS: agent details (hidden from non-management/legal roles)
    ('Analyst',   'contracts', 'agentName', true),
    ('Executive', 'contracts', 'agentName', true),
    ('Analyst',   'contracts', 'agentLicense', true),
    ('Executive', 'contracts', 'agentLicense', true),

    -- INJURIES: medical details (hidden from Media, Executive, Analyst)
    -- Media should only see injury status + return date, not clinical details
    ('Media',     'injuries', 'diagnosis', true),
    ('Media',     'injuries', 'treatment', true),
    ('Media',     'injuries', 'treatmentPlan', true),
    ('Media',     'injuries', 'surgeon', true),
    ('Media',     'injuries', 'surgeonName', true),
    ('Media',     'injuries', 'facility', true),
    ('Media',     'injuries', 'medicalProvider', true),
    ('Media',     'injuries', 'isSurgeryRequired', true),
    ('Media',     'injuries', 'surgeryDate', true),
    ('Media',     'injuries', 'cause', true),
    -- Executive sees high-level only
    ('Executive', 'injuries', 'diagnosis', true),
    ('Executive', 'injuries', 'treatment', true),
    ('Executive', 'injuries', 'treatmentPlan', true),
    ('Executive', 'injuries', 'surgeon', true),
    ('Executive', 'injuries', 'surgeonName', true),
    ('Executive', 'injuries', 'facility', true),
    ('Executive', 'injuries', 'medicalProvider', true),
    ('Executive', 'injuries', 'surgeryDate', true),
    -- Analyst sees injury type/severity for analysis but not treatment details
    ('Analyst',   'injuries', 'treatment', true),
    ('Analyst',   'injuries', 'treatmentPlan', true),
    ('Analyst',   'injuries', 'surgeon', true),
    ('Analyst',   'injuries', 'surgeonName', true),
    ('Analyst',   'injuries', 'facility', true),
    ('Analyst',   'injuries', 'medicalProvider', true),

    -- SCOUTING: screening assessment details (hidden from Coach)
    ('Coach',     'scouting', 'fitAssessment', true),
    ('Coach',     'scouting', 'riskAssessment', true),
    ('Coach',     'scouting', 'medicalClearance', true),
    ('Coach',     'scouting', 'identityCheck', true),
    ('Coach',     'scouting', 'voteDetails', true),
    ('Coach',     'scouting', 'dissentingOpinion', true),
    -- Scout can see assessments but not committee vote details
    ('Scout',     'scouting', 'voteDetails', true),
    ('Scout',     'scouting', 'dissentingOpinion', true),

    -- OFFERS: financial terms (hidden from Analyst)
    ('Analyst',   'offers', 'transferFee', true),
    ('Analyst',   'offers', 'salaryOffered', true),
    ('Analyst',   'offers', 'agentFee', true),
    ('Analyst',   'offers', 'counterOffer', true),

    -- GYM: body metrics (hidden from non-fitness roles who might access gym reads)
    ('Manager',   'gym', 'bodyFatPct', true),
    ('Manager',   'gym', 'muscleMass', true),
    ('Manager',   'gym', 'measurements', true)

    ON CONFLICT (role, module, field) DO UPDATE SET hidden = EXCLUDED.hidden;
  `);
}

export async function down() {
  // Remove the field permissions added by this migration
  await sequelize.query(`
    DELETE FROM role_field_permissions
    WHERE (module = 'injuries' AND field IN ('diagnosis', 'treatment', 'treatmentPlan', 'surgeon', 'surgeonName', 'facility', 'medicalProvider', 'isSurgeryRequired', 'surgeryDate', 'cause'))
       OR (module = 'scouting' AND field IN ('fitAssessment', 'riskAssessment', 'medicalClearance', 'identityCheck', 'voteDetails', 'dissentingOpinion'))
       OR (module = 'offers' AND field IN ('transferFee', 'salaryOffered', 'agentFee', 'counterOffer'))
       OR (module = 'gym' AND field IN ('bodyFatPct', 'muscleMass', 'measurements'))
       OR (module = 'players' AND field = 'nationalId')
       OR (module = 'contracts' AND field IN ('agentName', 'agentLicense'));
  `);

  // Note: module-level permissions will need to be re-seeded from the previous seed version
}
