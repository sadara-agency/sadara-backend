import { QueryInterface } from "sequelize";
import { tableExists } from "../migrationHelpers";

// The Player role must never see the internal `staffNotes` field on inbox items.
// The service already excludes it from the player projection; this row is the
// defence-in-depth via dynamicFieldAccess("player-inbox").

export async function up({
  context: queryInterface,
}: {
  context: QueryInterface;
}) {
  if (!(await tableExists(queryInterface, "role_field_permissions"))) return;

  await queryInterface.sequelize.query(`
    INSERT INTO role_field_permissions (role, module, field, hidden) VALUES
      ('Player', 'player-inbox', 'staffNotes', true)
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
    WHERE module = 'player-inbox' AND field = 'staffNotes';
  `);
}
