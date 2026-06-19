import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

// The Partner role must never see HQ-internal workflow fields on pipeline submissions.
// The service's resolvePartnerIdForUser scopes rows to the partner's own submissions;
// this migration is the defence-in-depth via dynamicFieldAccess("pipeline").
// Hidden fields: hqOwner, nextAction, conflictNote, notes, dueDate.

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "role_field_permissions"))) return;

  await queryInterface.sequelize.query(`
    INSERT INTO role_field_permissions (role, module, field, hidden) VALUES
      ('Partner', 'pipeline', 'hqOwner',      true),
      ('Partner', 'pipeline', 'nextAction',   true),
      ('Partner', 'pipeline', 'conflictNote', true),
      ('Partner', 'pipeline', 'notes',        true),
      ('Partner', 'pipeline', 'dueDate',      true)
    ON CONFLICT (role, module, field) DO UPDATE SET hidden = true;
  `);
}

export async function down({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "role_field_permissions"))) return;

  await queryInterface.sequelize.query(`
    DELETE FROM role_field_permissions
    WHERE role = 'Partner' AND module = 'pipeline'
      AND field IN ('hqOwner', 'nextAction', 'conflictNote', 'notes', 'dueDate');
  `);
}
